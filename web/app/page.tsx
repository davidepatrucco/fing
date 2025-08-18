import Link from "next/link";

export default function Home() {
  return (
    <div className="min-h-screen">
      {/* Hero Section */}
      <section className="bg-gradient-to-b from-gray-900 to-gray-950 py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h1 className="text-5xl md:text-7xl font-bold mb-6">
              <span className="bg-gradient-to-r from-purple-400 to-pink-600 bg-clip-text text-transparent">
                FIA
              </span>
            </h1>
            <h2 className="text-2xl md:text-3xl text-gray-300 mb-8">
              Finger In Ass Coin
            </h2>
            <p className="text-xl text-gray-400 mb-12 max-w-2xl mx-auto">
              The ultimate meme token on Base Sepolia with interactive fingering mechanics, 
              community leaderboards, and proof-of-finger rewards.
            </p>
            
            <div className="flex flex-col sm:flex-row gap-4 justify-center">
              <Link
                href="/token"
                className="bg-purple-600 hover:bg-purple-700 text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors"
              >
                View Token Details
              </Link>
              <Link
                href="/leaderboard"
                className="border border-purple-600 text-purple-400 hover:bg-purple-600 hover:text-white px-8 py-4 rounded-lg text-lg font-semibold transition-colors"
              >
                See Leaderboard
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Stats Section */}
      <section className="py-16 bg-gray-950">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">1B</div>
              <div className="text-gray-400">Total Supply</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">Base</div>
              <div className="text-gray-400">Network (Sepolia)</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">1%</div>
              <div className="text-gray-400">Transaction Fee</div>
            </div>
            <div className="text-center">
              <div className="text-3xl font-bold text-purple-400 mb-2">Live</div>
              <div className="text-gray-400">Event Monitor</div>
            </div>
          </div>
        </div>
      </section>

      {/* Features Section */}
      <section className="py-20">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <h2 className="text-3xl font-bold text-center mb-12">Features</h2>
          
          <div className="grid grid-cols-1 md:grid-cols-3 gap-8">
            <div className="bg-gray-900 p-6 rounded-lg">
              <div className="text-purple-400 text-2xl mb-4">🏆</div>
              <h3 className="text-xl font-bold mb-4">Leaderboard</h3>
              <p className="text-gray-400 mb-4">
                Track the biggest fingerers and receivers. Compete for the top spots and earn bragging rights.
              </p>
              <Link href="/leaderboard" className="text-purple-400 hover:text-purple-300">
                View Rankings →
              </Link>
            </div>
            
            <div className="bg-gray-900 p-6 rounded-lg">
              <div className="text-purple-400 text-2xl mb-4">📊</div>
              <h3 className="text-xl font-bold mb-4">Real-time Monitor</h3>
              <p className="text-gray-400 mb-4">
                Watch fingering events happen live. See every transaction as it occurs on the blockchain.
              </p>
              <Link href="/monitor" className="text-purple-400 hover:text-purple-300">
                Live Feed →
              </Link>
            </div>
            
            <div className="bg-gray-900 p-6 rounded-lg">
              <div className="text-purple-400 text-2xl mb-4">🛠️</div>
              <h3 className="text-xl font-bold mb-4">Developer Tools</h3>
              <p className="text-gray-400 mb-4">
                Deploy your own instance, run airdrops, and interact with the smart contracts.
              </p>
              <Link href="/tools" className="text-purple-400 hover:text-purple-300">
                Explore Tools →
              </Link>
            </div>
          </div>
        </div>
      </section>

      {/* Recent Events Teaser */}
      <section className="py-16 bg-gray-900">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
          <div className="text-center">
            <h2 className="text-3xl font-bold mb-8">Recent Fingering Activity</h2>
            <p className="text-gray-400 mb-8">
              Live events from the blockchain will appear here once the contract is deployed.
            </p>
            <Link
              href="/monitor"
              className="bg-purple-600 hover:bg-purple-700 text-white px-6 py-3 rounded-lg font-semibold transition-colors"
            >
              Watch Live Events
            </Link>
          </div>
        </div>
      </section>
    </div>
  );
}
