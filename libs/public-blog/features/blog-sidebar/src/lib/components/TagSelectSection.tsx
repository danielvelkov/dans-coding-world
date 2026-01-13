import { Tag } from '@dans-coding-world/public-blog-ui-common';
export function TagSelectSection({
  tags,
  activeTags,
  onTagSelect,
}: {
  tags: string[];
  activeTags?: string[];
  onTagSelect: (tagName: string) => void;
}) {
  return (
    <section>
      <h3>Tags</h3>
      {tags.map((tagName) => (
        <Tag
          key={tagName}
          isActive={activeTags?.includes(tagName) ?? false}
          name={tagName}
          onClick={onTagSelect}
        />
      ))}
    </section>
  );
}
