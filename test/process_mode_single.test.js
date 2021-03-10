'use strict';

const fs = require('mz/fs');
const path = require('path');
const sleep = require('mz-modules/sleep');
const request = require('supertest');
const mm = require('egg-mock');
const assert = require('assert');

describe('test/process_mode_single.test.js', () => {
  let app;
  before(async () => {
    app = await require('egg').start({
      env: 'production',
      baseDir: path.join(__dirname, 'fixtures/development'),
      plugins: {
        hotReload: {
          enable: true,
          path: path.join(__dirname, '..'),
        },
      },
    });
  });
  after(() => app.close());
  afterEach(mm.restore);

  it('should not reload', async () => {
    let warn = false;
    mm(app.agent.logger, 'warn', msg => {
      if (msg.includes('reload worker')) warn = true;
    });
    await request(app.callback()).get('/foo')
      .expect(200)
      .expect('foo');
    const filepath = path.join(__dirname, 'fixtures/development/app/service/a.js');
    await fs.writeFile(filepath, '');
    await sleep(1000);

    await request(app.callback()).get('/foo')
      .expect(200)
      .expect('foo');

    await fs.unlink(filepath);

    await request(app.callback()).get('/foo')
      .expect(200)
      .expect('foo');

    assert(!warn);
  });
});
