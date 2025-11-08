class AIServiceMonitor {
	constructor() {
		this.status = 'checking'
		this.lastHealth = null
		this.listeners = []
		this.checkInterval = null
	}

	async checkHealth() {
		const startTime = Date.now()
		this.status = 'checking'
		this.notifyListeners()

		try {
			const capabilities = await this.testCapabilities()
			const responseTime = Date.now() - startTime
			const isOnline = capabilities.llm || capabilities.neo4j

			const health = {
				status: isOnline ? 'online' : 'offline',
				lastChecked: new Date(),
				responseTime,
				capabilities,
			}

			this.status = health.status
			this.lastHealth = health
			this.notifyListeners()

			return health
		} catch (error) {
			const health = {
				status: 'error',
				lastChecked: new Date(),
				responseTime: Date.now() - startTime,
				errorMessage: error instanceof Error ? error.message : 'Unknown error',
				capabilities: {
					llm: false,
					neo4j: false,
					genai: false,
				},
			}

			this.status = 'error'
			this.lastHealth = health
			this.notifyListeners()

			return health
		}
	}

	async testCapabilities() {
		const capabilities = {
			llm: false,
			neo4j: false,
			genai: false,
		}

		try {
			if (typeof window !== 'undefined' && window.spark?.llm) {
				const testPrompt = window.spark.llmPrompt`Test`
				await Promise.race([
					window.spark.llm(testPrompt, 'gpt-4o-mini'),
					new Promise((_, reject) =>
						setTimeout(() => reject(new Error('LLM timeout')), 5000)
					),
				])
				capabilities.llm = true
				capabilities.genai = true
			}
		} catch (error) {
			console.warn('LLM service check failed:', error)
		}

		try {
			const { neo4jDriver } = await import('@/lib/drivers/neo4j-driver')
			if (neo4jDriver.isConnected()) {
				capabilities.neo4j = true
			}
		} catch (error) {
			console.warn('Neo4j service check failed:', error)
		}

		return capabilities
	}

	getStatus() {
		return this.status
	}

	getLastHealth() {
		return this.lastHealth
	}

	isOnline() {
		return this.status === 'online'
	}

	isOffline() {
		return this.status === 'offline' || this.status === 'error'
	}

	subscribe(listener) {
		this.listeners.push(listener)

		if (this.lastHealth) {
			listener(this.lastHealth)
		}

		return () => {
			this.listeners = this.listeners.filter((l) => l !== listener)
		}
	}

	notifyListeners() {
		if (this.lastHealth) {
			this.listeners.forEach((listener) => listener(this.lastHealth))
		}
	}

	startMonitoring(intervalMs = 60000) {
		if (this.checkInterval) {
			this.stopMonitoring()
		}

		this.checkHealth()

		this.checkInterval = setInterval(() => {
			this.checkHealth()
		}, intervalMs)
	}

	stopMonitoring() {
		if (this.checkInterval) {
			clearInterval(this.checkInterval)
			this.checkInterval = null
		}
	}
}

export const aiServiceMonitor = new AIServiceMonitor()

export { AIServiceMonitor }
