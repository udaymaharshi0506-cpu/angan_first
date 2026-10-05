import { db } from "@/db";
import { leadEvents, leads, meetings, notifications, properties, users } from "@/db/schema";
import { hash } from "bcryptjs";

export const DEMO_CUSTOMER_PHONE = "+919990000001";
export const DEMO_OWNER_PHONE = "+919990000002";
export const DEMO_ADMIN_EMAIL = "admin@aangan.demo";
export const DEMO_ADMIN_PASSWORD = "AanganDemo!2026";
export const DEMO_CUSTOMER_ID = "10000000-0000-4000-8000-000000000001";
export const DEMO_OWNER_ID = "10000000-0000-4000-8000-000000000002";
export const DEMO_ADMIN_ID = "10000000-0000-4000-8000-000000000003";

export const demoMode = () =>
  // Explicitly enabled, OR default-on when no Twilio SMS is configured
  (process.env.DEMO_MODE === "true" ||
    (process.env.DEMO_MODE !== "false" &&
      (!process.env.DATABASE_URL?.trim() ||
        /(?:127\.0\.0\.1|localhost)/.test(process.env.DATABASE_URL)))) &&
  !process.env.TWILIO_VERIFY_SERVICE_SID;

const photo = (id: number, width = 1200) => `https://images.pexels.com/photos/${id}/pexels-photo-${id}.jpeg?auto=compress&cs=tinysrgb&w=${width}`;

const sampleProperties = [
  { category: "buy_home", propertyType: "Apartment", title: "The Grove Residences", description: "A light-filled home where thoughtful design meets everyday ease. Enjoy an open-plan living and dining area, generous natural light, and quiet corners to make your own. Set in one of Bengaluru's most loved neighbourhoods, with cafés, parks, and everything you need within easy reach.", price: 14800000, address: "12, 4th Cross, 5th Block, Koramangala", city: "Bengaluru", locality: "Koramangala", latitude: 12.9352, longitude: 77.6245, bhkOrRoomType: "3 BHK", areaSqft: 1680, bathrooms: 3, furnishingStatus: "Semi-furnished", amenities: ["Covered Parking", "Balcony", "Power Backup", "Security", "Lift", "Park Nearby", "Modular Kitchen", "Water Supply"], images: [photo(7031732), photo(7214171), photo(6899447), photo(7672061)], reraNumber: "PRM/KA/RERA/1251/310/PR/220622/004984", verified: true, status: "live" },
  { category: "buy_home", propertyType: "Villa", title: "Solstice House", description: "An architectural hideaway with warm materials, open spaces, and a private garden. Designed for slow mornings, big gatherings, and every moment in between.", price: 28500000, address: "32, Palm Grove Road, Whitefield", city: "Bengaluru", locality: "Whitefield", latitude: 12.9698, longitude: 77.7500, bhkOrRoomType: "4 BHK", areaSqft: 2850, bathrooms: 4, furnishingStatus: "Furnished", amenities: ["Private Garden", "Covered Parking", "Security", "Power Backup", "Balcony", "Modular Kitchen"], images: [photo(31737842), photo(13600836), photo(8089172)], verified: true, status: "live" },
  { category: "rent_home", propertyType: "Apartment", title: "The Linden Loft", description: "A beautifully considered city apartment with soft finishes and room to breathe. Minutes from Indiranagar's best coffee shops, restaurants, and metro connection.", price: 42000, address: "8, 12th Main, HAL 2nd Stage", city: "Bengaluru", locality: "Indiranagar", latitude: 12.9719, longitude: 77.6412, bhkOrRoomType: "2 BHK", areaSqft: 1120, bathrooms: 2, furnishingStatus: "Fully furnished", amenities: ["Wi-Fi", "Balcony", "Covered Parking", "Security", "Power Backup", "Lift"], images: [photo(7214171), photo(7018401), photo(6934170)], deposit: 170000, verified: true, status: "live" },
  { category: "buy_home", propertyType: "Apartment", title: "Terrace Twenty One", description: "A bright, modern retreat with smart spatial planning and a generous balcony overlooking a tree-lined street. A little bit of calm in the middle of the city.", price: 11200000, address: "21, 27th Main Road, Sector 2", city: "Bengaluru", locality: "HSR Layout", latitude: 12.9116, longitude: 77.6389, bhkOrRoomType: "2 BHK", areaSqft: 1340, bathrooms: 2, furnishingStatus: "Semi-furnished", amenities: ["Balcony", "Lift", "Power Backup", "Covered Parking", "Security"], images: [photo(8089172), photo(7195886), photo(7672060)], verified: true, status: "live" },
  { category: "rent_pg", propertyType: "Co-living", title: "Stillhouse Co-Living", description: "Your own calm corner, with the good parts of living together. Thoughtful shared spaces, reliable Wi-Fi, and a community that feels like home. Meals and housekeeping are included.", price: 18500, address: "16, 6th Main, Koramangala 4th Block", city: "Bengaluru", locality: "Koramangala", latitude: 12.9345, longitude: 77.6198, bhkOrRoomType: "Private room", areaSqft: 320, bathrooms: 1, furnishingStatus: "Fully furnished", amenities: ["Meals Included", "Wi-Fi", "Housekeeping", "Laundry", "Security", "Power Backup"], images: [photo(6899447), photo(7534543), photo(7031732)], deposit: 18500, verified: true, status: "live" },
  { category: "rent_commercial", propertyType: "Office", title: "Northline Workspaces", description: "A flexible, sunlit workspace designed to help good ideas grow. Open floor plan, meeting rooms, excellent connectivity, and a distinguished Indiranagar address.", price: 125000, address: "45, 100 Feet Road, Indiranagar", city: "Bengaluru", locality: "Indiranagar", latitude: 12.9714, longitude: 77.6407, bhkOrRoomType: "Office space", areaSqft: 2200, bathrooms: 2, furnishingStatus: "Semi-furnished", amenities: ["Meeting Room", "Wi-Fi", "Covered Parking", "Security", "Power Backup", "Lift"], images: [photo(8453801), photo(7653579), photo(5918384)], verified: true, status: "live" },
  { category: "buy_home", propertyType: "Independent house", title: "Palm Courtyard", description: "A beautiful independent home built around open air and natural light. Generous living spaces, a leafy courtyard, and plenty of room for your next chapter.", price: 21000000, address: "9, 3rd Phase, JP Nagar", city: "Bengaluru", locality: "JP Nagar", latitude: 12.9063, longitude: 77.5857, bhkOrRoomType: "4 BHK", areaSqft: 2400, bathrooms: 3, furnishingStatus: "Unfurnished", amenities: ["Private Garden", "Covered Parking", "Balcony", "Water Supply", "Modular Kitchen"], images: [photo(13600836), photo(31737842), photo(7018401)], verified: true, status: "live" },
  { category: "rent_home", propertyType: "Apartment", title: "The Arbour Apartment", description: "A warm and welcoming apartment in the heart of Bandra, with a breezy layout, elegant interiors, and the city right on your doorstep.", price: 68000, address: "18, Chapel Road, Bandra West", city: "Mumbai", locality: "Bandra West", latitude: 19.0596, longitude: 72.8295, bhkOrRoomType: "2 BHK", areaSqft: 1050, bathrooms: 2, furnishingStatus: "Fully furnished", amenities: ["Balcony", "Security", "Lift", "Power Backup", "Wi-Fi"], images: [photo(7018401), photo(7195886), photo(6899447)], deposit: 200000, verified: true, status: "live" },
  { category: "rent_pg", propertyType: "PG", title: "Haven House", description: "Easy living, good company, and space to call your own. This fully managed co-living home includes fresh meals, fast internet, and weekly housekeeping.", price: 16000, address: "7, Lane 5, Koregaon Park", city: "Pune", locality: "Koregaon Park", latitude: 18.5362, longitude: 73.8939, bhkOrRoomType: "Shared room", areaSqft: 240, bathrooms: 1, furnishingStatus: "Fully furnished", amenities: ["Meals Included", "Wi-Fi", "Housekeeping", "Laundry", "Security"], images: [photo(7534543), photo(6934170), photo(6899447)], deposit: 16000, verified: true, status: "live" },
  { category: "rent_commercial", propertyType: "Office", title: "Cedar One Office", description: "A contemporary workplace with adaptable layouts, abundant daylight, and all the practical details already taken care of.", price: 95000, address: "88, Outer Ring Road, Marathahalli", city: "Bengaluru", locality: "Marathahalli", latitude: 12.9592, longitude: 77.6974, bhkOrRoomType: "Office space", areaSqft: 1850, bathrooms: 2, furnishingStatus: "Semi-furnished", amenities: ["Meeting Room", "Wi-Fi", "Covered Parking", "Lift", "Security"], images: [photo(7653579), photo(8453801), photo(5918384)], verified: true, status: "live" },
  { category: "buy_home", propertyType: "Apartment", title: "Cypress View", description: "An inviting home with fresh air, leafy views, and a beautifully simple layout. Made for the little everyday moments that matter most.", price: 9200000, address: "15, Road No. 10, Jubilee Hills", city: "Hyderabad", locality: "Jubilee Hills", latitude: 17.4311, longitude: 78.4079, bhkOrRoomType: "2 BHK", areaSqft: 1260, bathrooms: 2, furnishingStatus: "Semi-furnished", amenities: ["Balcony", "Covered Parking", "Lift", "Security"], images: [photo(7672061), photo(7031732), photo(8089172)], verified: true, status: "live" },
  { category: "rent_home", propertyType: "Apartment", title: "Atelier Apartment", description: "A relaxed modern space with muted tones, generous windows, and all the comforts of a thoughtfully finished home.", price: 57000, address: "24, Golf Course Road, Sector 54", city: "Gurugram", locality: "Sector 54", latitude: 28.4379, longitude: 77.1058, bhkOrRoomType: "3 BHK", areaSqft: 1560, bathrooms: 3, furnishingStatus: "Fully furnished", amenities: ["Covered Parking", "Lift", "Security", "Power Backup", "Balcony"], images: [photo(7195886), photo(7214171), photo(6934170)], verified: true, status: "live" },
  { category: "rent_home", propertyType: "Apartment", title: "Meadowlight Flat", description: "A serene, well-kept apartment close to green spaces and neighbourhood favourites. Awaiting the Aangan verification check before going live.", price: 36000, address: "4, 8th Cross, Jayanagar", city: "Bengaluru", locality: "Jayanagar", latitude: 12.9250, longitude: 77.5938, bhkOrRoomType: "2 BHK", areaSqft: 990, bathrooms: 2, furnishingStatus: "Semi-furnished", amenities: ["Balcony", "Lift", "Security"], images: [photo(7018386), photo(7031732)], verified: false, status: "pending_review" },
] as const;

let seedPromise: Promise<void> | undefined;

export function ensureSeedData() {
  if (!seedPromise) {
    seedPromise = (async () => {
      await db.insert(users).values([
        { id: DEMO_CUSTOMER_ID, phone: DEMO_CUSTOMER_PHONE, name: "Aarav Sharma", email: "aarav@example.demo", role: "customer", roles: ["customer"], otpVerifiedAt: new Date(), consentAt: new Date() },
        { id: DEMO_OWNER_ID, phone: DEMO_OWNER_PHONE, name: "Priya Mehta", email: "priya@example.demo", role: "owner", roles: ["customer", "owner"], otpVerifiedAt: new Date(), consentAt: new Date() },
      ]).onConflictDoNothing();

      if (demoMode() || (process.env.ADMIN_EMAIL && process.env.ADMIN_PASSWORD)) {
        const password = process.env.ADMIN_PASSWORD || DEMO_ADMIN_PASSWORD;
        await db.insert(users).values({ id: DEMO_ADMIN_ID, email: process.env.ADMIN_EMAIL || DEMO_ADMIN_EMAIL, name: "Aangan Admin", role: "admin", roles: ["admin"], passwordHash: await hash(password, 12), consentAt: new Date() }).onConflictDoNothing();
      }

      await db.insert(properties).values(sampleProperties.map((property, index) => ({
        ...property,
        id: `20000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`,
        ownerId: DEMO_OWNER_ID,
        amenities: [...property.amenities],
        images: [...property.images],
        status: property.status as "live" | "pending_review",
        category: property.category as "buy_home" | "rent_home" | "rent_pg" | "rent_commercial",
      }))).onConflictDoNothing();

      if (demoMode()) {
        const sampleLeads = [
          { id: "30000000-0000-4000-8000-000000000001", propertyId: "20000000-0000-4000-8000-000000000001", status: "new" as const, preferredContactTime: "Afternoon (12–5 PM)" },
          { id: "30000000-0000-4000-8000-000000000002", propertyId: "20000000-0000-4000-8000-000000000003", status: "contacted" as const, preferredContactTime: "Morning (9 AM–12 PM)" },
          { id: "30000000-0000-4000-8000-000000000003", propertyId: "20000000-0000-4000-8000-000000000006", status: "meeting_scheduled" as const, preferredContactTime: "Evening (5–8 PM)" },
        ];
        await db.insert(leads).values(sampleLeads.map((lead) => ({ ...lead, customerId: DEMO_CUSTOMER_ID, ownerId: DEMO_OWNER_ID }))).onConflictDoNothing();
        await db.insert(leadEvents).values(sampleLeads.map((lead, index) => ({ id: `50000000-0000-4000-8000-${String(index + 1).padStart(12, "0")}`, leadId: lead.id, eventType: index === 0 ? "created" : "status_change", detail: index === 0 ? "Customer expressed interest." : `Lead moved to ${lead.status}.` }))).onConflictDoNothing();
        await db.insert(meetings).values({ id: "40000000-0000-4000-8000-000000000001", leadId: sampleLeads[2].id, scheduledByAdminId: DEMO_ADMIN_ID, scheduledAt: new Date(Date.now() + 3 * 86400000), mode: "site_visit", status: "confirmed" }).onConflictDoNothing();
        await db.insert(notifications).values([
          { id: "60000000-0000-4000-8000-000000000001", userId: DEMO_OWNER_ID, type: "interest", message: "Someone is interested in The Grove Residences.", link: "/owner" },
          { id: "60000000-0000-4000-8000-000000000002", userId: DEMO_OWNER_ID, type: "interest", message: "Someone is interested in The Linden Loft.", link: "/owner" },
          { id: "60000000-0000-4000-8000-000000000003", userId: DEMO_CUSTOMER_ID, type: "meeting", message: "A viewing has been confirmed. Check your inquiries for details.", link: "/inquiries" },
        ]).onConflictDoNothing();
      }
    })().catch((error) => { seedPromise = undefined; throw error; });
  }
  return seedPromise;
}
