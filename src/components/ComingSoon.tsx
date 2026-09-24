import { Card, PageHeader } from "@/components/ui";

export function ComingSoon({ title }: { title: string }) {
  return (
    <div>
      <PageHeader title={title} />
      <Card>
        <p className="text-sm text-muted">
          Tính năng “{title}” đang được phát triển.
        </p>
      </Card>
    </div>
  );
}
