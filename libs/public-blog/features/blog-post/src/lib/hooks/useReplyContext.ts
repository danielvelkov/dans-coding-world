import { useContext } from 'react';
import { ReplyContext, ReplyContextValue } from '../contexts/ReplyContext';

export function useReplyContext(): ReplyContextValue {
  const ctx = useContext(ReplyContext);
  if (!ctx) {
    throw new Error(
      'useReplyContext() must be used inside <ReplyContextProvider>'
    );
  }
  return ctx;
}
