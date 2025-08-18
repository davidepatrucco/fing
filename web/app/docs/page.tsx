export default function DocsPage() {
  return (
    <div className="min-h-screen py-12">
      <div className="max-w-4xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="text-center mb-12">
          <h1 className="text-4xl font-bold mb-4">
            <span className="bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
              Documentation
            </span>
          </h1>
          <p className="text-gray-400 text-lg">
            Everything you need to know about FIA token
          </p>
        </div>

        <div className="space-y-8">
          {/* Quick Start */}
          <section className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Quick Start</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">1. Get Base Sepolia ETH</h3>
                <p className="text-gray-400 mb-2">
                  You need testnet ETH to interact with the FIA contract on Base Sepolia.
                </p>
                <ul className="list-disc pl-6 space-y-1 text-gray-400">
                  <li>
                    <a 
                      href="https://bridge.base.org/deposit" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300"
                    >
                      Base Sepolia Bridge
                    </a>
                  </li>
                  <li>
                    <a 
                      href="https://sepoliafaucet.com/" 
                      target="_blank" 
                      rel="noopener noreferrer"
                      className="text-purple-400 hover:text-purple-300"
                    >
                      Sepolia Faucet
                    </a>
                  </li>
                </ul>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">2. Add Base Sepolia to MetaMask</h3>
                <div className="bg-gray-800 p-4 rounded-lg">
                  <div className="grid grid-cols-1 md:grid-cols-2 gap-4 text-sm">
                    <div>
                      <strong>Network Name:</strong> Base Sepolia
                    </div>
                    <div>
                      <strong>RPC URL:</strong> https://sepolia.base.org
                    </div>
                    <div>
                      <strong>Chain ID:</strong> 84532
                    </div>
                    <div>
                      <strong>Symbol:</strong> ETH
                    </div>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* Contract Information */}
          <section className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Contract Information</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">FIA Token Contract</h3>
                <p className="text-gray-400 mb-4">
                  The FIA token implements ERC20 with additional fingering mechanics and fees.
                </p>
                <div className="bg-gray-800 p-4 rounded-lg space-y-2">
                  <div><strong>Contract Address:</strong> <span className="text-purple-400">To be deployed</span></div>
                  <div><strong>Total Supply:</strong> 1,000,000,000 FIA</div>
                  <div><strong>Decimals:</strong> 18</div>
                  <div><strong>Fee Structure:</strong> 1% total (0.5% treasury, 0.2% founder, 0.3% burn)</div>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Key Features</h3>
                <ul className="list-disc pl-6 space-y-2 text-gray-400">
                  <li><strong>Fingered Events:</strong> Every transfer emits a special &quot;Fingered&quot; event for tracking</li>
                  <li><strong>Fee on Transfer:</strong> 1% fee split between treasury, founder, and burn</li>
                  <li><strong>Fee Exemptions:</strong> Treasury, founder, and other designated addresses are exempt</li>
                  <li><strong>Burnable:</strong> Tokens can be permanently removed from circulation</li>
                </ul>
              </div>
            </div>
          </section>

          {/* Developer Guide */}
          <section className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Developer Guide</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Local Development</h3>
                <div className="bg-gray-800 p-4 rounded-lg">
                  <pre className="text-sm overflow-x-auto">
{`# Clone the repository
git clone https://github.com/davidepatrucco/fing.git
cd fing

# Install dependencies
cd fia-hardhat
npm install

# Set up environment variables
cp .env.example .env
# Edit .env with your values

# Compile contracts
npm run compile

# Deploy to Base Sepolia
npm run deploy

# Run tests
npm test`}
                  </pre>
                </div>
              </div>

              <div>
                <h3 className="text-lg font-semibold mb-2">Contract Interaction</h3>
                <div className="bg-gray-800 p-4 rounded-lg">
                  <pre className="text-sm overflow-x-auto">
{`// JavaScript/TypeScript example
import { ethers } from 'ethers';

const provider = new ethers.JsonRpcProvider('https://sepolia.base.org');
const contract = new ethers.Contract(contractAddress, abi, provider);

// Listen for Fingered events
contract.on('Fingered', (from, to, amount) => {
  console.log(\`\${from} fingered \${to} with \${amount} FIA\`);
});

// Get leaderboard data
const events = await contract.queryFilter('Fingered', 0, 'latest');`}
                  </pre>
                </div>
              </div>
            </div>
          </section>

          {/* API Reference */}
          <section className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">API Reference</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">Available Endpoints</h3>
                <div className="space-y-3">
                  <div className="bg-gray-800 p-3 rounded">
                    <div className="font-mono text-green-400">GET /api/contract</div>
                    <p className="text-gray-400 text-sm mt-1">Get contract information and verification status</p>
                  </div>
                  <div className="bg-gray-800 p-3 rounded">
                    <div className="font-mono text-green-400">GET /api/events?limit=100&fromBlock=0&toBlock=latest</div>
                    <p className="text-gray-400 text-sm mt-1">Get fingering events with optional filtering</p>
                  </div>
                  <div className="bg-gray-800 p-3 rounded">
                    <div className="font-mono text-green-400">GET /api/leaderboard?limit=50</div>
                    <p className="text-gray-400 text-sm mt-1">Get leaderboard data with aggregated statistics</p>
                  </div>
                </div>
              </div>
            </div>
          </section>

          {/* FAQ */}
          <section className="bg-gray-900 rounded-lg p-6">
            <h2 className="text-2xl font-bold mb-4">Frequently Asked Questions</h2>
            <div className="space-y-4">
              <div>
                <h3 className="text-lg font-semibold mb-2">What is FIA?</h3>
                <p className="text-gray-400">
                  FIA (Finger In Ass) is a meme token on Base Sepolia that tracks &quot;fingering&quot; interactions 
                  through special events and maintains community leaderboards.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">How do transaction fees work?</h3>
                <p className="text-gray-400">
                  Each transfer incurs a 1% fee split as follows: 0.5% to treasury, 0.2% to founder, 
                  and 0.3% burned permanently. Some addresses (treasury, founder) are exempt from fees.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">Is this on mainnet?</h3>
                <p className="text-gray-400">
                  Currently, FIA is deployed on Base Sepolia testnet for testing and development. 
                  A mainnet deployment may follow after thorough testing.
                </p>
              </div>
              
              <div>
                <h3 className="text-lg font-semibold mb-2">How can I contribute?</h3>
                <p className="text-gray-400">
                  Check out our{' '}
                  <a 
                    href="https://github.com/davidepatrucco/fing" 
                    target="_blank" 
                    rel="noopener noreferrer"
                    className="text-purple-400 hover:text-purple-300"
                  >
                    GitHub repository
                  </a>
                  {' '}to contribute code, report issues, or suggest improvements.
                </p>
              </div>
            </div>
          </section>
        </div>
      </div>
    </div>
  );
}