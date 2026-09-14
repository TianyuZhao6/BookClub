import { defineConfig } from '@playwright/test';
export default defineConfig({
 testDir:'./tests/browser',
 timeout:60000,
 expect:{timeout:15000},
 workers:1,
 reporter:[['list'],['html',{open:'never'}]],
 use:{baseURL:'http://127.0.0.1:4173',viewport:{width:1280,height:900},trace:'retain-on-failure',screenshot:'only-on-failure'},
 webServer:{command:'npm run dev -- --host 127.0.0.1 --port 4173',url:'http://127.0.0.1:4173/api/health',timeout:60000,reuseExistingServer:false}
});
