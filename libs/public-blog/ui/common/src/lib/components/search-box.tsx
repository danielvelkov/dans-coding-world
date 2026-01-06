import { ChangeEvent, useEffect, useState } from 'react';
import styled from 'styled-components';

const StyledSearchBox = styled.div`
  position: relative;
  width: 100%;
  max-width: min(50vw, 40ch);

  input {
    width: 100%;
    padding: 1em 3em 1em 3em;
    font-size: 1em;
    border: 2px solid #e0e0e0;
    border-radius: 8px;
    outline: none;
    transition: all 0.2s ease;
    background-color: #f5f5f5;

    &::placeholder {
      color: #999;
    }

    &:focus {
      background-color: #fff;
      border-color: #4a90e2;
      box-shadow: 0 2px 8px rgba(74, 144, 226, 0.15);
    }

    &:hover:not(:focus) {
      border-color: #c0c0c0;
    }
  }

  .fa-search {
    position: absolute;
    left: 1em;
    top: 50%;
    transform: translateY(-50%);
    color: #666;
    pointer-events: none;
    transition: color 0.2s ease;
  }

  .clear {
    position: absolute;
    right: -6em;
    top: 50%;
    transform: translateY(-50%);
    color: #666;
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
    color: #4a90e2;
  }
`;

export function SearchBox({
  currentValue,
  onChange,
}: {
  currentValue: string;
  onChange: (value: string) => void;
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
    <StyledSearchBox>
      <i className="fa fa-search"></i>
      <input
        aria-label="search"
        type="text"
        placeholder="Search"
        value={value}
        onInput={handleInput}
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
    </StyledSearchBox>
  );
}
export default SearchBox;
