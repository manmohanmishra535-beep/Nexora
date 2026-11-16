"use client";

import { useParams } from "next/navigation";

import PageHeader from "@/components/PageHeader";
import RelationList from "@/components/RelationList";

export default function FollowingPage() {
  const params = useParams();
  const username = String(params.username ?? "");

  return (
    <>
      <PageHeader title="Following" subtitle={`@${username}`} back />
      <RelationList username={username} field="following" />
    </>
  );
}
