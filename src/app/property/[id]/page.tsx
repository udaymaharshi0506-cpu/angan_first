import type { Metadata } from "next";
import { notFound } from "next/navigation";
import { PropertyDetail } from "@/components/property-detail";
import { getProperty, getSimilarProperties } from "@/lib/queries";
import { serializePublicProperty } from "@/lib/serializers";

export const dynamic = "force-dynamic";
export async function generateMetadata({ params }: { params: Promise<{ id: string }> }): Promise<Metadata> {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(id)) return { title: "Property not found" };
  const property = await getProperty(id);
  return property ? { title: property.title, description: `${property.bhkOrRoomType} ${property.propertyType} in ${property.locality}, ${property.city}. Explore this verified space on Aangan.`, openGraph: { images: property.images[0] ? [property.images[0]] : [] } } : { title: "Property not found" };
}
export default async function PropertyPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  if (!/^[a-f0-9-]{36}$/i.test(id)) notFound();
  const property = await getProperty(id);
  if (!property) notFound();
  const similar = await getSimilarProperties(property);
  return <PropertyDetail property={serializePublicProperty(property)} similar={similar}/>;
}
