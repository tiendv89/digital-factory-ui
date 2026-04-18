import Link from "next/link";
import { Table } from "@heroui/react";
import { getFeatureRepository } from "@/lib/repositories";
import { StatusBadge } from "@/components/status-badge";
import type { FeatureSummary } from "@/lib/types/feature";

function getCurrentReviewStatus(feature: FeatureSummary): string {
  const stage = feature.stages[feature.current_stage];
  return stage?.review_status ?? "unknown";
}

export default async function FeaturesListPage() {
  const features = await getFeatureRepository().findAll();

  return (
    <main className="p-8">
      <h1 className="text-3xl font-bold mb-6">
        Digital Factory — Feature Status Dashboard
      </h1>
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Features list" className="min-w-[900px]">
            <Table.Header>
              <Table.Column isRowHeader>Feature ID</Table.Column>
              <Table.Column>Title</Table.Column>
              <Table.Column>Status</Table.Column>
              <Table.Column>Review Status</Table.Column>
              <Table.Column>Tasks</Table.Column>
            </Table.Header>
            <Table.Body>
              {features.map((feature) => {
                const { taskCounts } = feature;
                const taskSummaryParts: string[] = [];
                if (taskCounts.done > 0)
                  taskSummaryParts.push(`${taskCounts.done} done`);
                if (taskCounts.in_progress > 0)
                  taskSummaryParts.push(`${taskCounts.in_progress} in progress`);
                if (taskCounts.in_review > 0)
                  taskSummaryParts.push(`${taskCounts.in_review} in review`);
                if (taskCounts.blocked > 0)
                  taskSummaryParts.push(`${taskCounts.blocked} blocked`);
                if (taskCounts.ready > 0)
                  taskSummaryParts.push(`${taskCounts.ready} ready`);
                const taskSummary = taskSummaryParts.join(" · ") || "no tasks";

                return (
                  <Table.Row key={feature.feature_id}>
                    <Table.Cell className="font-mono text-sm">
                      <Link
                        href={`/features/${feature.feature_id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {feature.feature_id}
                      </Link>
                    </Table.Cell>
                    <Table.Cell>{feature.title}</Table.Cell>
                    <Table.Cell>
                      <StatusBadge status={feature.feature_status} />
                    </Table.Cell>
                    <Table.Cell>
                      <StatusBadge status={getCurrentReviewStatus(feature)} />
                    </Table.Cell>
                    <Table.Cell className="text-sm text-gray-600">
                      {taskSummary}
                    </Table.Cell>
                  </Table.Row>
                );
              })}
            </Table.Body>
          </Table.Content>
        </Table.ScrollContainer>
      </Table>
    </main>
  );
}
