export default defineContentScript({
  matches: ['*://*.google.com/*'],
  main() {
    console.log('Hello content.');
  },
});

const root = document.createElement("div")
root.id = "fuckvruc-root"
document.body.prepend(root)