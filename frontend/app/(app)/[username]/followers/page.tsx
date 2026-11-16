"use client";

import { useParams } from "next/navigation";

import PageHeader from "@/components/PageHeader";
import RelationList from "@/components/RelationList";

export default function FollowersPage() {
  const params = useParams();
  const username = String(params.username ?? "");

  return (
    <>
      <PageHeader title="Followers" subtitle={`@${username}`} back />
      <RelationList username={username} field="followers" />
    </>
  );
}
