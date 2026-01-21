import { UseQueryResult } from '@tanstack/react-query';
import { GetPostsMetadataResponse } from '@dans-coding-world/shared-post-dto';
import styled from 'styled-components';
import React, { Fragment } from 'react';

const StyledYearButton = styled.button<
  React.ComponentPropsWithoutRef<'button'> & { $selected: boolean }
>`
  background: none;
  border: none;
  padding: 0;
  font: inherit;
  margin: 0 2px;
  color: ${({ $selected }) => ($selected ? 'red' : 'inherit')};
  cursor: pointer;

  text-decoration: ${({ $selected }) => ($selected ? 'underline' : 'none')};
  text-underline-offset: 3px;

  &:hover {
    text-decoration: underline;
  }

  &:focus-visible {
    outline: 2px solid red;
    outline-offset: 2px;
  }
`;

export function PostYearSelection({
  yearsQuery,
  selectedYear,
  onYearToggle,
}: {
  yearsQuery: UseQueryResult<GetPostsMetadataResponse>;
  selectedYear?: number;
  onYearToggle: (year: number) => void;
}) {
  const { data, isLoading, isError } = yearsQuery;

  if (isLoading || isError || !data || !data.years || data.years.length === 0) {
    return null;
  }

  const normalizedSelectedYear = selectedYear
    ? Number(selectedYear)
    : undefined;

  return (
    <section aria-labelledby="year-filter-heading">
      <h3 id="year-filter-heading">Select Posts by year</h3>

      {[...data.years]
        .sort((prev, next) => next - prev)
        .map((year, index) => (
          <Fragment key={`filter by ${year}`}>
            <StyledYearButton
              $selected={year === normalizedSelectedYear}
              aria-pressed={
                year === normalizedSelectedYear ? 'true' : undefined
              }
              onClick={() => onYearToggle(year)}
            >
              {year}
            </StyledYearButton>
            {index < data.years.length - 1 && ' • '}
          </Fragment>
        ))}
    </section>
  );
}
