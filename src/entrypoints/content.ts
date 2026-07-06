export default defineContentScript({
  matches: ['*://*.google.com/*'],
  main() {
    console.log('Hello content.');
  },
});

const root = document.createElement("div")
root.id = "ruc-plus-root"
document.body.prepend(root)