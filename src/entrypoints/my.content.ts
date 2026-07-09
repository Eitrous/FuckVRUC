import './hide.css';

export default defineContentScript({
  matches: ['https://my.ruc.edu.cn/*'],
  main() {
    console.log('script loaded');
  },
});
