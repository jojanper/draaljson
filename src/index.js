class JsonBundler {
    static create(env) {
        return new JsonBundler(env);
    }

    constructor(env) {
        this.env = env;
    }

    init() {
        console.log(this.env);
    }
}

module.exports = {
    JsonBundler
};
