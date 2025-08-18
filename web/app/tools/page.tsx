export default function ToolsPage() {
  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              Developer Tools
            </span>
          </h1>
          <p className="text-gray-400 text-lg">
            Tools and utilities for deploying and managing FIA tokens
          </p>
        </div>

        <div className="space-y-8">
          {/* Deployment Tools */}
          <section className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Contract Deployment</h2>
            <p className="text-gray-400 mb-6">
              Deploy your own FIA contract instance on Base Sepolia or mainnet.
            </p>
            
            <div className="bg-gray-800 rounded-lg p-4 mb-4">
              <h3 className="text-lg font-semibold mb-2">Quick Deploy Commands</h3>
              <pre className="text-sm overflow-x-auto text-green-400">
{`# Clone and setup
git clone https://github.com/davidepatrucco/fing.git
cd fing/fia-hardhat
npm install

# Configure environment
cp .env.example .env
# Set PRIVATE_KEY and RPC_BASE_SEPOLIA

# Deploy to Base Sepolia
npm run deploy

# Verify contract (optional)
npm run verify -- --constructor-args arguments.js CONTRACT_ADDRESS`}
              </pre>
            </div>

            <div className="bg-yellow-900/20 border border-yellow-500/20 rounded-lg p-4">
              <div className="flex items-start">
                <div className="text-yellow-400 mr-2">⚠️</div>
                <div>
                  <h4 className="font-semibold text-yellow-400">Security Note</h4>
                  <p className="text-yellow-200 text-sm">
                    Never commit private keys to version control. Use environment variables 
                    or secure key management systems.
                  </p>
                </div>
              </div>
            </div>
          </section>

          {/* Airdrop Tools */}
          <section className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Airdrop Tools</h2>
            <p className="text-gray-400 mb-6">
              Batch distribute FIA tokens to multiple addresses efficiently.
            </p>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">CSV Format</h3>
                <div className="bg-gray-800 rounded-lg p-4">
                  <pre className="text-sm">
{`address,amount
0x742d35Cc6531Bc2F7B1E27d18FDd5C8Db64b785D,1000000000000000000
0x8ba1f109551bD432803012645Hac136c1DaCaf98,2000000000000000000
0x1234567890123456789012345678901234567890,500000000000000000`}
                  </pre>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Airdrop Script</h3>
                <div className="bg-gray-800 rounded-lg p-4">
                  <pre className="text-sm text-green-400">
{`# Prepare recipients.csv file
# Run airdrop
node scripts/airdrop.js recipients.csv

# Or use hardhat task
npx hardhat airdrop --csv recipients.csv --network baseSepolia`}
                  </pre>
                </div>
              </div>

              <div className="bg-blue-900/20 border border-blue-500/20 rounded-lg p-4">
                <div className="flex items-start">
                  <div className="text-blue-400 mr-2">💡</div>
                  <div>
                    <h4 className="font-semibold text-blue-400">Pro Tip</h4>
                    <p className="text-blue-200 text-sm">
                      Test your airdrop with a small batch first. The script automatically 
                      handles gas estimation and batching for large distributions.
                    </p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Monitoring Tools */}
          <section className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Event Monitoring</h2>
            <p className="text-gray-400 mb-6">
              Watch for fingering events and generate leaderboards in real-time.
            </p>
            
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Watch Events</h3>
                <div className="bg-gray-800 rounded-lg p-4">
                  <pre className="text-sm text-green-400">
{`# Watch for live events
FIA_ADDR=0xYourContractAddress npm run monitor

# Generate leaderboard
FIA_ADDR=0xYourContractAddress npm run leaderboard`}
                  </pre>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">API Integration</h3>
                <div className="bg-gray-800 rounded-lg p-4">
                  <pre className="text-sm text-green-400">
{`# Get latest events
curl "http://localhost:3000/api/events?limit=10"

# Get leaderboard
curl "http://localhost:3000/api/leaderboard?limit=50"

# Get contract info
curl "http://localhost:3000/api/contract"`}
                  </pre>
                </div>
              </div>
            </div>
          </section>

          {/* Configuration */}
          <section className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Configuration</h2>
            <p className="text-gray-400 mb-6">
              Environment variables and configuration options.
            </p>
            
            <div className="bg-gray-800 rounded-lg p-4">
              <h3 className="text-lg font-semibold mb-2">Required Environment Variables</h3>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                <div>
                  <strong className="text-purple-400">PRIVATE_KEY</strong>
                  <p className="text-gray-400">Deployer wallet private key</p>
                </div>
                <div>
                  <strong className="text-purple-400">RPC_BASE_SEPOLIA</strong>
                  <p className="text-gray-400">Base Sepolia RPC endpoint</p>
                </div>
                <div>
                  <strong className="text-purple-400">BASESCAN_API_KEY</strong>
                  <p className="text-gray-400">For contract verification</p>
                </div>
                <div>
                  <strong className="text-purple-400">FIA_ADDR</strong>
                  <p className="text-gray-400">Deployed contract address</p>
                </div>
              </div>
            </div>
          </section>

          {/* Support */}
          <section className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Support & Resources</h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
              <div>
                <h3 className="text-lg font-semibold mb-2">Documentation</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a href="/docs" className="text-purple-400 hover:text-purple-300">
                      📚 Complete Documentation
                    </a>
                  </li>
                  <li>
                    <a href="https://github.com/davidepatrucco/fing" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">
                      🔗 GitHub Repository
                    </a>
                  </li>
                  <li>
                    <a href="https://docs.base.org" target="_blank" rel="noopener noreferrer" className="text-purple-400 hover:text-purple-300">
                      🏗️ Base Documentation
                    </a>
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Community</h3>
                <ul className="space-y-2 text-sm">
                  <li>
                    <a href="#" className="text-purple-400 hover:text-purple-300">
                      💬 Discord Community
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-purple-400 hover:text-purple-300">
                      📱 Telegram Group
                    </a>
                  </li>
                  <li>
                    <a href="#" className="text-purple-400 hover:text-purple-300">
                      🐦 Twitter Updates
                    </a>
                  </li>
                </ul>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}