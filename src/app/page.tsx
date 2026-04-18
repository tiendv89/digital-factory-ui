import Link from "next/link";
import { Table } from "@heroui/react";
import { getMockFeatureSummaries } from "@/lib/mock/data";
import { StatusBadge } from "@/components/status-badge";

export default function FeaturesListPage() {
  const features = getMockFeatureSummaries();

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
              <Table.Column>Stage</Table.Column>
              <Table.Column>Review Status</Table.Column>
              <Table.Column>Tasks</Table.Column>
            </Table.Header>
            <Table.Body>
              {features.map((feature) => {
                const { task_counts } = feature;
                const taskSummaryParts: string[] = [];
                if (task_counts.done > 0)
                  taskSummaryParts.push(`${task_counts.done} done`);
                if (task_counts.in_progress > 0)
                  taskSummaryParts.push(`${task_counts.in_progress} in progress`);
                if (task_counts.in_review > 0)
                  taskSummaryParts.push(`${task_counts.in_review} in review`);
                if (task_counts.blocked > 0)
                  taskSummaryParts.push(`${task_counts.blocked} blocked`);
                if (task_counts.ready > 0)
                  taskSummaryParts.push(`${task_counts.ready} ready`);
                const taskSummary = taskSummaryParts.join(" · ") || "no tasks";

                return (
                  <Table.Row key={feature.id}>
                    <Table.Cell className="font-mono text-sm">
                      <Link
                        href={`/features/${feature.id}`}
                        className="text-blue-600 hover:underline"
                      >
                        {feature.id}
                      </Link>
                    </Table.Cell>
                    <Table.Cell>{feature.title}</Table.Cell>
                    <Table.Cell>
                      <StatusBadge status={feature.stage} />
                    </Table.Cell>
                    <Table.Cell>
                      <StatusBadge status={feature.review_status} />
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
