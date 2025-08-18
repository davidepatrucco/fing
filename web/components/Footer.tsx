import Link from 'next/link';

export default function Footer() {
  return (
    <footer className="bg-gray-900 border-t border-gray-700">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        <div className="grid grid-cols-1 md:grid-cols-4 gap-8">
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">FIA</h3>
            <p className="text-gray-400 text-sm">
              Finger In Ass Coin - A meme token on Base Sepolia
            </p>
          </div>
          
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Links</h3>
            <ul className="space-y-2">
              <li>
                <Link href="/token" className="text-gray-400 hover:text-white text-sm">
                  Token Info
                </Link>
              </li>
              <li>
                <Link href="/leaderboard" className="text-gray-400 hover:text-white text-sm">
                  Leaderboard
                </Link>
              </li>
              <li>
                <Link href="/docs" className="text-gray-400 hover:text-white text-sm">
                  Documentation
                </Link>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Social</h3>
            <ul className="space-y-2">
              <li>
                <a href="#" className="text-gray-400 hover:text-white text-sm">
                  Twitter/X
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white text-sm">
                  Telegram
                </a>
              </li>
              <li>
                <a href="#" className="text-gray-400 hover:text-white text-sm">
                  Discord
                </a>
              </li>
            </ul>
          </div>
          
          <div>
            <h3 className="text-white text-lg font-semibold mb-4">Developer</h3>
            <ul className="space-y-2">
              <li>
                <a 
                  href="https://github.com/davidepatrucco/fing" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white text-sm"
                >
                  GitHub
                </a>
              </li>
              <li>
                <a 
                  href="https://sepolia.basescan.org" 
                  target="_blank" 
                  rel="noopener noreferrer"
                  className="text-gray-400 hover:text-white text-sm"
                >
                  BaseScan
                </a>
              </li>
            </ul>
          </div>
        </div>
        
        <div className="mt-8 pt-8 border-t border-gray-700">
          <div className="flex flex-col md:flex-row justify-between items-center">
            <p className="text-gray-400 text-sm">
              © 2024 FIA Token. This is experimental software on testnet.
            </p>
            <div className="mt-4 md:mt-0">
              <Link href="/security" className="text-gray-400 hover:text-white text-sm mr-6">
                Security
              </Link>
              <span className="text-gray-400 text-sm">
                Made with 💜 for the meme community
              </span>
            </div>
          </div>
        </div>
      </div>
    </footer>
  );
}