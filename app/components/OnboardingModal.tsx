'use client'

import { useState, useEffect } from 'react'

export default function OnboardingModal() {
  const [isOpen, setIsOpen] = useState(false)
  const [step, setStep] = useState(1) // 1:概要, 2:規約, 3:PWA
  const [isAgreed, setIsAgreed] = useState(false)
  const [isIOS, setIsIOS] = useState(false)

  useEffect(() => {
    // 1. 過去に表示済みかチェック
    const hasSeen = localStorage.getItem('has_seen_onboarding_v1')
    
    if (!hasSeen) {
      // iOS判定 (表示が必要な場合のみチェック)
      const userAgent = window.navigator.userAgent.toLowerCase()
      const isIosDevice = /iphone|ipad|ipod/.test(userAgent)

      // ★修正箇所: setTimeoutでラップして非同期にする（エラー回避）
      setTimeout(() => {
        if (isIosDevice) {
          setIsIOS(true)
        }
        setIsOpen(true)
      }, 0)
    }
  }, [])

  const handleNext = () => {
    setStep(prev => prev + 1)
  }

  const handleComplete = () => {
    localStorage.setItem('has_seen_onboarding_v1', 'true')
    setIsOpen(false)
  }

  if (!isOpen) return null

  return (
    <div className="fixed inset-0 z-[100] flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm animate-fade-in">
      <div className="bg-white rounded-2xl w-full max-w-sm overflow-hidden shadow-2xl animate-fade-in-up">
        
        {/* --- ステップ1: アプリ概要 --- */}
        {step === 1 && (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-blue-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
              👋
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-4">
              しずおかコネクトへ<br/>ようこそ！
            </h2>
            <p className="text-sm text-gray-600 leading-relaxed mb-6">
              このアプリは、静岡の地域活動とあなたをつなぐプラットフォームです。<br/><br/>
              イベントに参加してQRコードでチェックインしたり、クエストに挑戦してランクを上げましょう！
            </p>
            <button 
              onClick={handleNext}
              className="w-full bg-blue-600 text-white py-3 rounded-xl font-bold shadow-md hover:bg-blue-700 transition-colors"
            >
              次へ進む
            </button>
          </div>
        )}

        {/* --- ステップ2: 利用規約 --- */}
        {step === 2 && (
          <div className="p-6">
            <h2 className="text-lg font-bold text-gray-800 mb-4 text-center">
              利用にあたってのお願い
            </h2>
            
            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 h-48 overflow-y-auto text-xs text-gray-600 space-y-3 mb-4">
              <p>
                <strong>1. 目的</strong><br/>
                本アプリは地域活性化とコミュニティ形成を目的としています。
              </p>
              <p>
                <strong>2. 禁止事項</strong><br/>
                他の利用者への誹謗中傷、迷惑行為、公序良俗に反する行為は禁止されています。
              </p>
              <p>
                <strong>3. 免責事項</strong><br/>
                当アプリを通じて発生したトラブルについて、運営は一切の責任を負いかねます。
              </p>
              <p>
                <strong>4. 運営について</strong><br/>
                本アプリは有志による運営であり、特定の自治体や教育機関の公式アプリではありません。
              </p>
            </div>

            <label className="flex items-center gap-3 p-2 cursor-pointer mb-4 hover:bg-gray-50 rounded-lg transition-colors">
              <input 
                type="checkbox" 
                className="w-5 h-5 text-blue-600 rounded focus:ring-blue-500 border-gray-300"
                checked={isAgreed}
                onChange={(e) => setIsAgreed(e.target.checked)}
              />
              <span className="text-sm font-bold text-gray-700">上記の内容に同意します</span>
            </label>

            <button 
              onClick={handleNext}
              disabled={!isAgreed}
              className={`w-full py-3 rounded-xl font-bold shadow-md transition-colors ${
                isAgreed 
                  ? 'bg-blue-600 text-white hover:bg-blue-700' 
                  : 'bg-gray-200 text-gray-400 cursor-not-allowed'
              }`}
            >
              同意して次へ
            </button>
          </div>
        )}

        {/* --- ステップ3: PWA誘導 (ホーム画面追加) --- */}
        {step === 3 && (
          <div className="p-6 text-center">
            <div className="w-16 h-16 bg-green-100 rounded-full flex items-center justify-center mx-auto mb-4 text-3xl">
              🔔
            </div>
            <h2 className="text-xl font-bold text-gray-800 mb-2">
              アプリとして使おう！
            </h2>
            <p className="text-xs text-gray-500 mb-6">
              ホーム画面に追加すると、通知が届いたり、全画面でサクサク動くようになります。
            </p>

            <div className="bg-gray-50 p-4 rounded-xl border border-gray-200 text-left mb-6">
              {isIOS ? (
                <ol className="text-sm text-gray-700 space-y-3">
                  <li className="flex gap-2">
                    <span className="bg-gray-200 text-gray-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                    <span>画面下の <span className="text-blue-600 font-bold">共有アイコン</span> をタップ</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="bg-gray-200 text-gray-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                    <span>メニューから <span className="font-bold">「ホーム画面に追加」</span> を選択</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="bg-gray-200 text-gray-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">3</span>
                    <span>右上の <span className="font-bold">「追加」</span> をタップ</span>
                  </li>
                </ol>
              ) : (
                <ol className="text-sm text-gray-700 space-y-3">
                  <li className="flex gap-2">
                    <span className="bg-gray-200 text-gray-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">1</span>
                    <span>ブラウザのメニュー(︙) をタップ</span>
                  </li>
                  <li className="flex gap-2">
                    <span className="bg-gray-200 text-gray-600 w-5 h-5 rounded-full flex items-center justify-center text-[10px] font-bold shrink-0">2</span>
                    <span><span className="font-bold">「アプリをインストール」</span>または<span className="font-bold">「ホーム画面に追加」</span>を選択</span>
                  </li>
                </ol>
              )}
            </div>

            <button 
              onClick={handleComplete}
              className="w-full bg-black text-white py-3 rounded-xl font-bold shadow-md hover:bg-gray-800 transition-colors"
            >
              はじめる
            </button>
            
            <button 
              onClick={handleComplete}
              className="mt-3 text-xs text-gray-400 hover:text-gray-600 underline"
            >
              今はしない
            </button>
          </div>
        )}

        {/* ステップインジケーター */}
        <div className="flex justify-center gap-1 pb-6">
          <div className={`h-1 rounded-full transition-all duration-300 ${step === 1 ? 'w-8 bg-blue-600' : 'w-2 bg-gray-200'}`}></div>
          <div className={`h-1 rounded-full transition-all duration-300 ${step === 2 ? 'w-8 bg-blue-600' : 'w-2 bg-gray-200'}`}></div>
          <div className={`h-1 rounded-full transition-all duration-300 ${step === 3 ? 'w-8 bg-blue-600' : 'w-2 bg-gray-200'}`}></div>
        </div>

      </div>
    </div>
  )
}