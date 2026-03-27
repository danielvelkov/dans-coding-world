import { Link } from 'react-router-dom';

export function Header({
  isDarkMode,
  setIsDarkMode,
}: {
  isDarkMode: boolean;
  setIsDarkMode: (flag: boolean) => void;
}) {
  return (
    <header>
      <nav>
        <ul>
          <li>
            <Link to="/login">Login</Link>
          </li>
          <li>
            <Link to="/blog">Blog</Link>
          </li>
          <li>
            <button onClick={() => setIsDarkMode(!isDarkMode)}>
              {isDarkMode ? (
                <i className="fas fa-sun"></i>
              ) : (
                <i className=" fas fa-moon"></i>
              )}
            </button>
          </li>
        </ul>
      </nav>
    </header>
  );
}
