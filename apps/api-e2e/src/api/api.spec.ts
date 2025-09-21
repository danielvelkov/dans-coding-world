import axios from 'axios';

describe('GET /api/v1', () => {
  it('should return a message', async () => {
    const res = await axios.get(`/api/v1`);

    expect(res.status).toBe(200);
    expect(res.data).toEqual({ message: 'Welcome to v1 of the api!' });
  });
});
