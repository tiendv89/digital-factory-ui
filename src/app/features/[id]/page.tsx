import { notFound } from "next/navigation";
import Link from "next/link";
import { Table } from "@heroui/react";
import { getFeatureRepository } from "@/lib/repositories";
import { StatusBadge } from "@/components/status-badge";
import type { Feature } from "@/lib/types/feature";
import type { Task } from "@/lib/types/task";

// Always render at request time — data comes from live filesystem reads.
export const dynamic = "force-dynamic";

interface FeatureDetailPageProps {
  params: Promise<{ id: string }>;
}

function getCurrentReviewStatus(feature: Feature): string {
  const stage = feature.stages[feature.current_stage];
  return stage?.review_status ?? "unknown";
}

export default async function FeatureDetailPage({
  params,
}: FeatureDetailPageProps) {
  const { id } = await params;
  const repo = getFeatureRepository();
  const [feature, tasks] = await Promise.all([
    repo.findById(id),
    repo.findTasksByFeatureId(id),
  ]);

  if (!feature) {
    notFound();
  }

  return (
    <main className="p-8">
      {/* Back link */}
      <Link href="/" className="text-blue-600 hover:underline text-sm mb-4 inline-block">
        ← Back to all features
      </Link>

      {/* Feature header */}
      <div className="mb-8">
        <h1 className="text-3xl font-bold mb-2">{feature.title}</h1>
        <p className="font-mono text-sm text-gray-500 mb-4">{feature.feature_id}</p>
        <div className="flex flex-wrap gap-3 items-center">
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Stage:</span>
            <StatusBadge status={feature.current_stage} />
          </div>
          <div className="flex items-center gap-2">
            <span className="text-sm text-gray-500">Review:</span>
            <StatusBadge status={getCurrentReviewStatus(feature)} />
          </div>
          {feature.next_action && (
            <div className="flex items-center gap-2">
              <span className="text-sm text-gray-500">Next action:</span>
              <span className="text-sm">{feature.next_action}</span>
            </div>
          )}
        </div>
      </div>

      {/* Tasks table */}
      <h2 className="text-xl font-semibold mb-4">Tasks ({tasks.length})</h2>
      <Table>
        <Table.ScrollContainer>
          <Table.Content aria-label="Feature tasks" className="min-w-[900px]">
            <Table.Header>
              <Table.Column isRowHeader>ID</Table.Column>
              <Table.Column>Title</Table.Column>
              <Table.Column>Status</Table.Column>
              <Table.Column>Repo</Table.Column>
              <Table.Column>Actor</Table.Column>
              <Table.Column>Depends on</Table.Column>
              <Table.Column>PR</Table.Column>
            </Table.Header>
            <Table.Body>
              {tasks.map((task: Task) => {
                const isBlocked = task.status === "blocked";
                const hasUnmetDeps =
                  task.depends_on.length > 0 &&
                  task.depends_on.some((depId) => {
                    const dep = tasks.find((t) => t.id === depId);
                    return dep && dep.status !== "done";
                  });
                const prUrl = task.pr?.url;

                return (
                  <Table.Row
                    key={task.id}
                    className={isBlocked ? "bg-red-50" : undefined}
                  >
                    <Table.Cell className="font-mono text-sm font-medium">
                      {task.id}
                    </Table.Cell>
                    <Table.Cell>
                      <div>
                        <span>{task.title}</span>
                        {isBlocked && task.blocked_reason && (
                          <p className="text-xs text-red-600 mt-1">
                            Blocked: {task.blocked_reason}
                          </p>
                        )}
                      </div>
                    </Table.Cell>
                    <Table.Cell>
                      <StatusBadge status={task.status} />
                    </Table.Cell>
                    <Table.Cell className="font-mono text-xs">
                      {task.repo}
                    </Table.Cell>
                    <Table.Cell className="text-sm">
                      {task.execution?.actor_type ?? "—"}
                    </Table.Cell>
                    <Table.Cell>
                      {task.depends_on.length === 0 ? (
                        <span className="text-gray-400 text-xs">—</span>
                      ) : hasUnmetDeps ? (
                        <span className="text-amber-600 text-xs">
                          waiting on {task.depends_on.join(", ")}
                        </span>
                      ) : (
                        <span className="text-gray-500 text-xs">
                          {task.depends_on.join(", ")}
                        </span>
                      )}
                    </Table.Cell>
                    <Table.Cell>
                      {prUrl ? (
                        <a
                          href={prUrl}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-blue-600 hover:underline text-xs"
                        >
                          PR
                        </a>
                      ) : (
                        <span className="text-gray-400 text-xs">—</span>
                      )}
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
