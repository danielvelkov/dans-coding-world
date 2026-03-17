import { useFetchPost } from '@dans-coding-world/public-blog-shared-hooks';
import { Tag, UserAvatar } from '@dans-coding-world/public-blog-ui-common';
import DOMPurify from 'dompurify';
import styled from 'styled-components';
import { Link, useNavigate } from 'react-router-dom';
import {
  stringifyToQueryString,
  formatDateTo_Month_DD_YYYY,
} from '@dans-coding-world/helpers';
import type { FetchPostsQueryParams } from '@dans-coding-world/public-blog-shared-hooks';
import { getReadingTime } from './util/post-ux.util';
import { ShimmerPost } from './components/ShimmerPost';
import CommentSection from './components/CommentSection';

const StyledPost = styled.article`
  display: flex;
  flex-direction: column;
  gap: 1em;

  .tags {
    display: flex;
    gap: 0.5em;
    flex-wrap: wrap;
    align-items: baseline;
    color: ${({ theme }) => theme.text.secondary};
    margin-bottom: 5em;
  }
`;

const StyledTitle = styled.h1`
  text-align: center;
`;

const StyledContent = styled.div<React.ComponentPropsWithoutRef<'div'>>`
  border-top: 1px solid ${({ theme }) => theme.text.muted};
  padding: 1.5em 0;
  word-wrap: break-word;
`;

const StyledHeader = styled.header`
  & {
    padding: 1em 0;
  }

  .post-details,
  .detail {
    display: flex;
    flex-wrap: wrap;
    align-items: center;
    justify-content: center;
    gap: 0.8em;
    color: ${({ theme }) => theme.text.secondary};
  }

  .post-details > .detail.tags {
    flex-basis: 100%;
    gap: 5px;
  }

  a {
    color: ${({ theme }) => theme.text.primary};
    text-decoration: none;
  }

  .author-name:hover {
    color: ${({ theme }) => theme.accent.hover};
    text-decoration: underline;
  }
`;

export function BlogPost({ postId }: { postId: number }) {
  const navigate = useNavigate();
  const { data, isPending } = useFetchPost(postId);
  const showLoading = isPending || !data;

  const userLoggedIn = false; //TODO

  if (showLoading || !data)
    return <main>{showLoading && <ShimmerPost />}</main>;

  const { post } = data;

  if (post.visibility === 'MEMBERS_ONLY' && !userLoggedIn) navigate('/login');

  const authorName = post.author.profile
    ? `${post.author.profile.firstName} ${post.author.profile.lastName}`
    : post.author.username;
  const publishedDate = new Date(post.publishedAt as Date);
  const modifiedDate = new Date(post.updatedAt as Date);

  const showUpdatedDate =
    new Date(post.publishedAt as Date) < new Date(post.updatedAt as Date);

  return (
    <StyledPost>
      <StyledHeader>
        <StyledTitle>{data.post.title}</StyledTitle>

        <div className="post-details">
          <Link
            to={`/users/${post.author.id}`}
            aria-label={`View profile of ${authorName}`}
            className="detail"
          >
            <UserAvatar
              avatarURL={post.author.profile?.avatarURL}
              name={authorName}
              shape="circle"
              size={post.author.profile?.avatarURL ? 'LG' : 'S'}
            />
            <span className="author-name">
              {`By `}
              <em>{authorName}</em>
            </span>
          </Link>

          <span
            aria-label={`Posted on ${publishedDate.toDateString()}`}
            className="detail"
          >
            <i className="fa fas fa-calendar"></i>

            <time dateTime={publishedDate.toISOString()}>
              {formatDateTo_Month_DD_YYYY(publishedDate)}
            </time>
          </span>

          {showUpdatedDate && (
            <span
              aria-label={`Last edited on ${modifiedDate.toDateString()}`}
              className="detail"
            >
              <i className="fa fa-edit"></i>
              <time dateTime={modifiedDate.toISOString()}>
                {formatDateTo_Month_DD_YYYY(modifiedDate)}
              </time>
            </span>
          )}

          <span className="detail" aria-label="Reading time (in minutes)">
            <i className="fa fa-clock"></i>
            {`${getReadingTime(data.post.content)} read`}
          </span>
        </div>
      </StyledHeader>

      <StyledContent
        data-testid="post-content"
        dangerouslySetInnerHTML={{
          __html: DOMPurify.sanitize(data.post.content),
        }}
      ></StyledContent>

      <div className="tags">
        <i className="fa fa-tag"></i>
        <b>Tagged</b>
        {post.tags &&
          post.tags.map((element) => (
            <Tag
              key={element}
              isActive={false}
              name={element}
              onClick={(tagName) =>
                navigate(
                  `/blog?${stringifyToQueryString({
                    filterBy: {
                      tags: [tagName],
                    },
                  } as FetchPostsQueryParams)}`
                )
              }
            ></Tag>
          ))}
      </div>

      <CommentSection postId={postId}></CommentSection>
    </StyledPost>
  );
}

export default BlogPost;
