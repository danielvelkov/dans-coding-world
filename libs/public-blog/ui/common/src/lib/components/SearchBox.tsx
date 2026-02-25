import { ChangeEvent, useEffect, useState } from 'react';
import styled from 'styled-components';

const StyledSearch = styled('search')`
  position: relative;
  width: 100%;
  max-width: min(50vw, 40ch);

  input {
    box-sizing: border-box;
    width: 100%;
    padding: 1em 3em 1em 3em;
    font-size: 1em;
    border: 2px solid ${({ theme }) => theme.border.primary};
    color: ${({ theme }) => theme.text.secondary};

    border-radius: 8px;
    outline: none;
    transition: all 0.2s ease;
    background-color: ${({ theme }) => theme.background.surface};

    &::placeholder {
      color: ${({ theme }) => theme.text.muted};
    }

    &:focus {
      background-color: ${({ theme }) => theme.background.elevated};
      border-color: ${({ theme }) => theme.accent.primary};
      box-shadow: 0 2px 8px rgba(74, 144, 226, 0.15);
    }

    &:hover:not(:focus) {
      border-color: ${({ theme }) => theme.border.hover};
    }
  }

  .fa-search {
    position: absolute;
    left: 1em;
    top: 50%;
    transform: translateY(-50%);
    color: ${({ theme }) => theme.accent.primary};
    pointer-events: none;
    transition: color 0.2s ease;
  }

  .clear {
    position: absolute;
    right: 1em;
    top: 50%;
    transform: translateY(-50%);
    color: ${({ theme }) => theme.accent.primary};
    cursor: pointer;
    transition: color 0.2s ease;
    padding: 0.3em 0.5em;
    border-radius: 100%;
    outline: none;
    background-color: inherit;
    border: none;
  }

  .clear:hover {
    background-color: #666;
  }

  input:focus ~ i {
    color: ${({ theme }) => theme.accent.primary};
  }
`;

export function SearchBox({
  currentValue,
  onChange,
  maxLength,
}: {
  currentValue: string;
  onChange: (value: string) => void;
  maxLength?: number;
}) {
  const [value, setValue] = useState(currentValue);
  useEffect(() => {
    setValue(currentValue);
  }, [currentValue]);

  const handleInput = (e: ChangeEvent<HTMLInputElement>) => {
    const newValue = e.target.value;
    setValue(newValue);
    onChange(newValue);
  };

  return (
    <StyledSearch>
      <i className="fa fa-search"></i>
      <input
        aria-label="search"
        type="text"
        placeholder="Search"
        value={value}
        onInput={handleInput}
        maxLength={maxLength}
      />
      {value && (
        <button
          aria-label="Clear search"
          className="clear"
          onClick={() => {
            setValue('');
            onChange('');
          }}
        >
          <i className="fa fa-close"></i>
        </button>
      )}
    </StyledSearch>
  );
}
export default SearchBox;
