import "dotenv/config";
import test from "node:test";
import assert from "node:assert/strict";
import { NextRequest, NextResponse } from "next/server";
import { dispatch } from "../src/lib/api-handler";
import { DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD, DEMO_CUSTOMER_PHONE, DEMO_OWNER_PHONE } from "../src/lib/seed";

type Method = "GET" | "POST" | "PATCH" | "DELETE";
async function call(route: string, method: Method = "GET", input?: unknown, cookie?: string) {
  const headers = new Headers();
  if (input !== undefined) headers.set("Content-Type", "application/json");
  if (cookie) headers.set("Cookie", cookie);
  const request = new NextRequest(`http://localhost:3000/api/${route}`, { method, headers, ...(input !== undefined ? { body: JSON.stringify(input) } : {}) });
  return dispatch(request, method, { params: Promise.resolve({ segments: route.split("/") }) });
}
function cookieFrom(response: NextResponse, name: string) {
  const cookie = response.cookies.get(name);
  assert.ok(cookie?.value, `Expected ${name} session cookie`);
  return `${name}=${cookie.value}`;
}
function hasNoPII(value: unknown, secrets: string[]) {
  const json = JSON.stringify(value);
  for (const secret of secrets) assert.ok(!json.includes(secret), `Private data leaked into public JSON: ${secret}`);
}

test("real route handlers keep seeker and owner contact details separated", async () => {
  const customerSignIn = await call("auth/demo", "POST", { role: "customer" });
  assert.equal(customerSignIn.status, 200);
  const customerCookie = cookieFrom(customerSignIn, "aangan_access");
  const ownerSignIn = await call("auth/demo", "POST", { role: "owner" });
  assert.equal(ownerSignIn.status, 200);
  const ownerCookie = cookieFrom(ownerSignIn, "aangan_access");

  const publicProperty = await (await call("properties/20000000-0000-4000-8000-000000000001")).json();
  hasNoPII(publicProperty, [DEMO_OWNER_PHONE, "priya@example.demo", "Priya Mehta", "ownerId", "passwordHash"]);

  const createdResponse = await call("leads", "POST", { propertyId: "20000000-0000-4000-8000-000000000002", preferredContactTime: "Morning" }, customerCookie);
  assert.ok([200, 201].includes(createdResponse.status));
  const created = await createdResponse.json();
  hasNoPII(created, [DEMO_OWNER_PHONE, "priya@example.demo", "Priya Mehta", "ownerId", "ownerPhone", "ownerEmail", "adminNotes", "history"]);
  assert.ok(created.lead?.id);

  const customerResponse = await call("customer/leads", "GET", undefined, customerCookie);
  assert.equal(customerResponse.status, 200);
  const customerPayload = await customerResponse.json();
  assert.ok(customerPayload.items.length > 0);
  hasNoPII(customerPayload, [DEMO_OWNER_PHONE, "priya@example.demo", "Priya Mehta", "ownerId", "ownerPhone", "ownerEmail", "ownerName", "adminNotes", "history"]);

  const ownerResponse = await call("owner/leads", "GET", undefined, ownerCookie);
  assert.equal(ownerResponse.status, 200);
  const ownerPayload = await ownerResponse.json();
  assert.ok(ownerPayload.items.length > 0);
  hasNoPII(ownerPayload, [DEMO_CUSTOMER_PHONE, "aarav@example.demo", "Aarav Sharma", "customerId", "customerPhone", "customerEmail", "customerName", "adminNotes", "history"]);

  const ownerNotifications = await (await call("notifications", "GET", undefined, ownerCookie)).json();
  hasNoPII(ownerNotifications, [DEMO_CUSTOMER_PHONE, "aarav@example.demo", "Aarav Sharma"]);

  const seekerMeeting = await (await call("leads/30000000-0000-4000-8000-000000000003/meeting", "GET", undefined, customerCookie)).json();
  const ownerMeeting = await (await call("leads/30000000-0000-4000-8000-000000000003/meeting", "GET", undefined, ownerCookie)).json();
  assert.equal(seekerMeeting.meeting?.status, "confirmed");
  assert.deepEqual(seekerMeeting, ownerMeeting);
  hasNoPII(seekerMeeting, [DEMO_CUSTOMER_PHONE, DEMO_OWNER_PHONE, "customerId", "ownerId", "scheduledByAdminId"]);

  const denied = await call("admin/leads", "GET", undefined, customerCookie);
  assert.equal(denied.status, 403);
  const rejectedListing = await call("properties", "POST", { category: "rent_home", propertyType: "Apartment", title: "Contact me for this great home", description: "Call me on 9876543210 for the nicest apartment in this area.", price: 45000, address: "5 Park Road", city: "Bengaluru", locality: "Koramangala", bhkOrRoomType: "2 BHK", areaSqft: 1200, bathrooms: 2, furnishingStatus: "Unfurnished", images: ["https://example.com/photo.jpg"] }, ownerCookie);
  assert.equal(rejectedListing.status, 422);

  const firstFactor = await call("admin/login", "POST", { email: DEMO_ADMIN_EMAIL, password: DEMO_ADMIN_PASSWORD });
  assert.equal(firstFactor.status, 200);
  const challengeCookie = cookieFrom(firstFactor, "aangan_admin_challenge");
  const secondFactor = await call("admin/2fa", "POST", { code: "000000" }, challengeCookie);
  assert.equal(secondFactor.status, 200);
  const adminCookie = cookieFrom(secondFactor, "aangan_access");
  const adminResponse = await call("admin/leads", "GET", undefined, adminCookie);
  assert.equal(adminResponse.status, 200);
  const adminPayload = await adminResponse.json();
  assert.ok(adminPayload.items[0].history.length > 0);
  const { pool } = await import("../src/db/index");
  await pool.end();
});

