const bs = require("browser-sync").create();

const config = {
    ui: false,
    port: 8080,
    server: ".",
    watch: true,
    notify: false,
    
};

bs.init(config, () => {
    console.log('server up');
})

// bs.emitter.on('init', (e) => {
//     console.log('init', e);
// });

bs.emitter.on('file:watching', (e) => {
    console.log('file:watching');
});