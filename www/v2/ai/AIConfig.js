export class AIConfig {
    constructor() {
        this.baseUrl = localStorage.getItem('aiBaseUrl') || 'https://ai.aistargalaxy.com';
        this.apiKey  = localStorage.getItem('aiApiKey')  || '';
        this.model   = localStorage.getItem('aiModel')   || 'qwen2.5:14b';
    }

    save({ baseUrl, apiKey, model }) {
        if (baseUrl !== undefined) { this.baseUrl = baseUrl.trim().replace(/\/$/, ''); localStorage.setItem('aiBaseUrl', this.baseUrl); }
        if (apiKey  !== undefined) { this.apiKey  = apiKey.trim();   localStorage.setItem('aiApiKey',  this.apiKey); }
        if (model   !== undefined) { this.model   = model;           localStorage.setItem('aiModel',   this.model); }
    }
}
