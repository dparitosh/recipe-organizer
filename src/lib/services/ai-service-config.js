export const DEFAULT_AI_CONFIG = {
	mode: 'auto',
	onlineEndpoint: undefined,
	offlineCapabilities: {
		basicSearch: true,
		dataAnalysis: true,
		recommendations: true,
	},
	autoFallback: true,
	retryAttempts: 2,
	timeoutMs: 10000,
}

class AIServiceConfigManager {
	constructor() {
		this.config = { ...DEFAULT_AI_CONFIG }
	}

	setConfig(partialConfig) {
		this.config = { ...this.config, ...partialConfig }
	}

	getConfig() {
		return { ...this.config }
	}

	getMode() {
		return this.config.mode
	}

	setMode(mode) {
		this.config.mode = mode
	}

	isOnlineMode() {
		return this.config.mode === 'online' || this.config.mode === 'auto'
	}

	isOfflineMode() {
		return this.config.mode === 'offline'
	}

	shouldAutoFallback() {
		return this.config.autoFallback && this.config.mode === 'auto'
	}

	getRetryAttempts() {
		return this.config.retryAttempts
	}

	getTimeoutMs() {
		return this.config.timeoutMs
	}

	getOfflineCapabilities() {
		return { ...this.config.offlineCapabilities }
	}
}

export const aiServiceConfig = new AIServiceConfigManager()

export { AIServiceConfigManager }
