import { useContext } from 'react';
import {
  CommentContext,
  CommentContextValue,
} from '../contexts/CommentContext';

export function useCommentContext(): CommentContextValue {
  const ctx = useContext(CommentContext);
  if (!ctx) {
    throw new Error(
      'useCommentContext() must be used inside <CommentContextProvider>'
    );
  }
  return ctx;
}
