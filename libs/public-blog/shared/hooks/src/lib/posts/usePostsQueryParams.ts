import { useSearchParams } from 'react-router-dom';
import { useEffect, useMemo } from 'react';
import {
  mergePostQueryDefaults,
  defaultFilters,
} from './utils/merge-post-query-defaults';
import { stripDefaultPostQueryParams } from './utils/strip-default-post-query-params';
import { FetchPostsQueryParams } from '../types/fetchPostsQueryParams';
import {
  stringifyToQueryString,
  parseQueryString,
} from '@dans-coding-world/helpers';
import PostQueryParams from './validation-schema/post-query-params.schema';

export function usePostsQueryParams() {
  const [searchParams, setSearchParams] = useSearchParams();

  const { queryParams, isValid } = useMemo(() => {
    const rawParams = parseQueryString(searchParams.toString());

    const { success, data, error } = PostQueryParams.safeParse(rawParams);

    if (success) {
      const merged = mergePostQueryDefaults(
        (data as FetchPostsQueryParams) || {},
      );
      return {
        queryParams: merged,
        isValid: true,
      };
    }

    // TODO: handle errors
    if (error) {
      // console.error(error);
    }

    return {
      queryParams: defaultFilters,
      isValid: false,
    };
  }, [searchParams]);

  useEffect(() => {
    if (!isValid) {
      const filteredValues = stripDefaultPostQueryParams(defaultFilters);
      const cleanQuery = stringifyToQueryString(filteredValues);
      setSearchParams(cleanQuery, { replace: true });
    }
  }, [isValid, setSearchParams]);

  const setQueryParams = (value: FetchPostsQueryParams) => {
    const filteredValues = stripDefaultPostQueryParams(value);
    setSearchParams(stringifyToQueryString(filteredValues));
  };

  return { queryParams, setQueryParams };
}

export default usePostsQueryParams;
