import { mockAuth, render } from '@dans-coding-world/public-blog-tools';
import { BrowserRouter } from 'react-router-dom';
import App from './app';
import { server } from '../routes/blog/mocks/node';

vi.mock(
  '@dans-coding-world/public-blog-shared-hooks',
  async (importOriginal) => {
    return {
      ...(await importOriginal()),
      useAuth: vi.fn(),
    };
  },
);
vi.mock('@dans-coding-world/public-blog-data-access-api');

vi.mock('../styles/useThemeDetector', () => ({
  default: () => true,
}));

describe('App', () => {
  beforeAll(() => server.listen());
  afterEach(() => server.resetHandlers());
  afterAll(() => server.close());

  beforeEach(() => {
    mockAuth();
    vi.clearAllMocks();
  });
  it('should render successfully', () => {
    const { baseElement } = render(
      <BrowserRouter
        future={{
          v7_relativeSplatPath: true,
          v7_startTransition: true,
        }}
      >
        <App />
      </BrowserRouter>,
    );
    expect(baseElement).toBeTruthy();
  });
});
