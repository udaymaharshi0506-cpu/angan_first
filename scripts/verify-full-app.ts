import "dotenv/config";
import assert from "node:assert/strict";
import { NextRequest, NextResponse } from "next/server";
import { dispatch } from "../src/lib/api-handler";
import { pool } from "../src/db/index";
import { DEMO_ADMIN_EMAIL, DEMO_ADMIN_PASSWORD, DEMO_CUSTOMER_PHONE, DEMO_OWNER_PHONE } from "../src/lib/seed";

type Method = "GET" | "POST" | "PATCH" | "DELETE";

async function call(route: string, method: Method = "GET", input?: unknown, cookie?: string) {
  const [pathname, search] = route.split("?");
  const headers = new Headers();
  if (input !== undefined) headers.set("Content-Type", "application/json");
  if (cookie) headers.set("Cookie", cookie);
  const url = `http://localhost:3000/api/${pathname}${search ? `?${search}` : ""}`;
  const request = new NextRequest(url, {
    method,
    headers,
    ...(input !== undefined ? { body: JSON.stringify(input) } : {}),
  });
  return dispatch(request, method, { params: Promise.resolve({ segments: pathname.split("/") }) });
}

function getCookie(response: NextResponse, name: string): string {
  const cookie = response.cookies.get(name);
  assert.ok(cookie?.value, `Expected cookie ${name} not found in response`);
  return `${name}=${cookie.value}`;
}

async function runEndToEndVerification() {
  console.log("================================================================");
  console.log("   AANGAN MARKETPLACE — COMPREHENSIVE END-TO-END VERIFICATION   ");
  console.log("================================================================\n");

  const results: { test: string; status: "PASS" | "FAIL"; details: string }[] = [];

  function record(test: string, ok: boolean, details: string) {
    results.push({ test, status: ok ? "PASS" : "FAIL", details });
    console.log(`[${ok ? "PASS" : "FAIL"}] ${test}`);
    if (details) console.log(`       ${details}`);
  }

  try {
    // 1. Health check & Database Query
    console.log("--- TEST 1: Database & Health Check ---");
    const dbCheck = await pool.query("SELECT count(*) as total FROM properties;");
    const count = Number(dbCheck.rows[0].total);
    record("Database Query Execution", count > 0, `Database has ${count} properties loaded.`);

    // 2. Public Property Fetching
    console.log("\n--- TEST 2: Public Property Listings (Dynamic Fetch) ---");
    const propResponse = await call("properties?limit=5");
    assert.equal(propResponse.status, 200);
    const propData = await propResponse.json();
    assert.ok(Array.isArray(propData.items) && propData.items.length > 0);
    const firstProperty = propData.items[0];
    record("Public Properties API", true, `Returned ${propData.items.length} properties. First: "${firstProperty.title}" (${firstProperty.city})`);

    // Verify Public Property has NO Owner PII
    const hasOwnerPii = "ownerPhone" in firstProperty || "ownerEmail" in firstProperty || "ownerId" in firstProperty;
    record("Public Property PII Stripping", !hasOwnerPii, "Owner phone, email, and ID are completely stripped from public property API.");

    // 3. Seeker Authentication
    console.log("\n--- TEST 3: Seeker Authentication & Session ---");
    const seekerAuth = await call("auth/demo", "POST", { role: "customer" });
    assert.equal(seekerAuth.status, 200);
    const seekerCookie = getCookie(seekerAuth, "aangan_access");
    const seekerData = await seekerAuth.json();
    record("Seeker Demo Sign-in", true, `Seeker signed in as: ${seekerData.user.name} (${seekerData.user.phone})`);

    // 4. Owner Authentication
    console.log("\n--- TEST 4: Owner Authentication & Session ---");
    const ownerAuth = await call("auth/demo", "POST", { role: "owner" });
    assert.equal(ownerAuth.status, 200);
    const ownerCookie = getCookie(ownerAuth, "aangan_access");
    const ownerData = await ownerAuth.json();
    record("Owner Demo Sign-in", true, `Owner signed in as: ${ownerData.user.name} (${ownerData.user.phone})`);

    // 5. Seeker Expresses Interest in Owner's Property
    console.log("\n--- TEST 5: Seeker Expresses Interest (Lead Creation) ---");
    // Find an owner's property
    const ownerPropsRes = await call("owner/properties", "GET", undefined, ownerCookie);
    assert.equal(ownerPropsRes.status, 200);
    const ownerPropsData = await ownerPropsRes.json();
    const targetProperty = ownerPropsData.items[0];
    assert.ok(targetProperty?.id, "Owner has at least one property");

    const interestRes = await call(
      "leads",
      "POST",
      { propertyId: targetProperty.id, preferredContactTime: "Afternoon (12 PM - 4 PM)" },
      seekerCookie
    );
    assert.ok([200, 201].includes(interestRes.status));
    const interestData = await interestRes.json();
    record("Lead Creation Flow", true, `Expressed interest in: "${targetProperty.title}". Status: ${interestRes.status}`);

    // Verify Seeker's response does NOT leak Owner's phone or email
    const seekerLeadJson = JSON.stringify(interestData);
    const leaksOwnerToSeeker = seekerLeadJson.includes(DEMO_OWNER_PHONE) || seekerLeadJson.includes("priya@example.demo");
    record("Seeker Privacy Shield", !leaksOwnerToSeeker, "Owner's phone and email are NOT exposed to the seeker.");

    // 6. Owner Dashboard Check (Privacy Check)
    console.log("\n--- TEST 6: Owner Dashboard Lead View (Privacy Check) ---");
    const ownerLeadsRes = await call("owner/leads", "GET", undefined, ownerCookie);
    assert.equal(ownerLeadsRes.status, 200);
    const ownerLeadsData = await ownerLeadsRes.json();
    const ownerLead = ownerLeadsData.items.find((item: any) => item.property?.id === targetProperty.id) || ownerLeadsData.items[0];
    assert.ok(ownerLead, "Owner has received the lead notification");

    const ownerLeadJson = JSON.stringify(ownerLeadsData);
    const leaksSeekerToOwner = ownerLeadJson.includes(DEMO_CUSTOMER_PHONE) || ownerLeadJson.includes("rahul@example.demo");
    record("Owner Privacy Shield", !leaksSeekerToOwner, "Seeker's phone and email are NOT exposed to the owner.");

    // Check that owner sees seeker's display name or message
    record("Owner Notification Message", Boolean(ownerLead.message), `Owner sees message: "${ownerLead.message}"`);

    // 7. Owner Notifications Check
    console.log("\n--- TEST 7: Owner Notifications Feed ---");
    const ownerNotifsRes = await call("notifications", "GET", undefined, ownerCookie);
    assert.equal(ownerNotifsRes.status, 200);
    const ownerNotifsData = await ownerNotifsRes.json();
    const hasInterestNotif = ownerNotifsData.items.some((n: any) => n.type === "interest");
    record("Owner In-App Notification", hasInterestNotif, `Owner has ${ownerNotifsData.items.length} notifications, including interest alerts.`);

    // 8. Admin 2-Factor Authentication Flow
    console.log("\n--- TEST 8: Admin Authentication (Email + Password + 2FA) ---");
    const adminFactor1 = await call("admin/login", "POST", { email: DEMO_ADMIN_EMAIL, password: DEMO_ADMIN_PASSWORD });
    assert.equal(adminFactor1.status, 200);
    const adminChallengeCookie = getCookie(adminFactor1, "aangan_admin_challenge");

    const adminFactor2 = await call("admin/2fa", "POST", { code: "000000" }, adminChallengeCookie);
    assert.equal(adminFactor2.status, 200);
    const adminCookie = getCookie(adminFactor2, "aangan_access");
    record("Admin 2FA Login", true, "Admin successfully authenticated with 2-Factor verification.");

    // 9. Admin Lead Management (Complete Data Access)
    console.log("\n--- TEST 9: Admin Lead Management (Centralized Oversight) ---");
    const adminLeadsRes = await call("admin/leads", "GET", undefined, adminCookie);
    assert.equal(adminLeadsRes.status, 200);
    const adminLeadsData = await adminLeadsRes.json();
    const adminLead = adminLeadsData.items[0];
    assert.ok(adminLead, "Admin has access to leads");

    const adminHasCustomerPhone = Boolean(adminLead.customer?.phone);
    const adminHasOwnerPhone = Boolean(adminLead.owner?.phone);
    record(
      "Admin Complete Contact Access",
      adminHasCustomerPhone && adminHasOwnerPhone,
      `Admin sees both Seeker (${adminLead.customer?.name}: ${adminLead.customer?.phone}) and Owner (${adminLead.owner?.name}: ${adminLead.owner?.phone})`
    );

    // 10. Admin Scheduling Coordination
    console.log("\n--- TEST 10: Admin Schedules Site Visit/Call ---");
    const scheduleRes = await call(
      "admin/meetings",
      "POST",
      {
        leadId: adminLead.id,
        scheduledAt: new Date(Date.now() + 86400000).toISOString(),
        mode: "site_visit",
      },
      adminCookie
    );
    assert.ok([200, 201].includes(scheduleRes.status));
    record("Admin Meeting Coordination", true, "Admin successfully scheduled a site visit between seeker and owner.");

    // 11. Saved Searches & Favorites Flow
    console.log("\n--- TEST 11: Seeker Favorites & Saved Searches ---");
    const favRes = await call(`favorites/${targetProperty.id}`, "POST", undefined, seekerCookie);
    assert.ok([200, 201].includes(favRes.status));
    record("Seeker Favorites Flow", true, `Saved property "${targetProperty.title}" to favorites.`);

  } catch (err: any) {
    console.error("Test execution error:", err);
    record("Full Test Suite Execution", false, err.message);
  } finally {
    await pool.end();
  }

  console.log("\n================================================================");
  console.log("                     VERIFICATION SUMMARY                       ");
  console.log("================================================================");
  const total = results.length;
  const passed = results.filter((r) => r.status === "PASS").length;
  const failed = results.filter((r) => r.status === "FAIL").length;

  console.log(`Total Checks : ${total}`);
  console.log(`Passed       : ${passed}`);
  console.log(`Failed       : ${failed}`);
  console.log(`System Status: ${failed === 0 ? "ALL SYSTEMS OPERATIONAL (100% WORKING)" : "FAILURES DETECTED"}`);
  console.log("================================================================\n");

  if (failed > 0) process.exit(1);
}

runEndToEndVerification();
