module.exports = { reactStrictMode: true, async headers() { return [{ source: '/(.*)', headers: [{ key: 'X-Frame-Options', value: 'DENY' }, { key: 'Referrer-Policy', value: 'no-referrer' }] }]; } };
