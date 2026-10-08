import { startApp } from './ui/app.js';

const app = document.getElementById('app');
// hosts may embed us as a fragment without <html dir="rtl">: carry the direction ourselves
app.dir = 'rtl';
app.lang = 'he';
startApp(app);
