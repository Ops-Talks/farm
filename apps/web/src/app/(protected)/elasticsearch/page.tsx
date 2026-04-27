// Server Component shell for the Elasticsearch overview (FARM-S354 /
// FARM-T406 / Phase 35). Interactive logic — fetching, filtering and
// rendering — lives in `ElasticsearchOverviewClient`.
import { ElasticsearchOverviewClient } from "./_components/ElasticsearchOverviewClient";

export const metadata = {
  title: "Elasticsearch Indices",
};

export default function ElasticsearchOverviewPage() {
  return <ElasticsearchOverviewClient />;
}
