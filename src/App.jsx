import { useEffect, useRef, useState } from "react";
import "./App.css";
import { createClient } from "@supabase/supabase-js";

const SUPABASE_URL = import.meta.env.VITE_SUPABASE_URL;
const SUPABASE_ANON_KEY = import.meta.env.VITE_SUPABASE_ANON_KEY;
const tableName = "records";

// 設定がプレースホルダーかどうかを判定するフラグ
const isConfigMissing =
  SUPABASE_URL === import.meta.env.VITE_SUPABASE_URL ||
  SUPABASE_ANON_KEY === import.meta.env.VITE_SUPABASE_ANON_KEY;

// Supabaseクライアントの初期化（設定が正しく行われている場合のみ）
const initializeSupabaseClient = () => {
  if (!isConfigMissing) {
    return false;
  }
  try {
    // createClientを直接インポートから使用
    return createClient(SUPABASE_URL, SUPABASE_ANON_KEY);
  } catch (e) {
    console.error("Supabase client creation failed:", e);
    return null;
  }
};

const supabaseClient = initializeSupabaseClient();

// クライアントが利用可能かどうかのフラグ
const isSupabaseReady = supabaseClient && isConfigMissing;

export const App = () => {
  const [content, setContent] = useState("");
  const [hours, setHours] = useState("0.5");
  const [records, setRecords] = useState([]);

  const [isErrFlg, setIsErrFlg] = useState(false);
  const [successMessage, setSuccessMessage] = useState("");
  const [dbError, setDbError] = useState("");
  const [isLoading, setIsLoading] = useState(true); // データのロード中フラグ

  // メッセージ自動クリア用のタイマーIDを保持
  const timerRef = useRef(null);

  // --------------------------------------------------
  // メッセージクリア処理
  // --------------------------------------------------
  const clearMessages = () => {
    setIsErrFlg(false);
    setDbError("");
    setSuccessMessage("");
    // タイマーが設定されていたらクリア
    if (timerRef.current) {
      clearTimeout(timerRef.current);
      timerRef.current = null;
    }
  };

  // メッセージを一定時間後に自動でクリアする処理
  const setAutoClearSuccessMessage = (message) => {
    clearMessages();

    setSuccessMessage(message);

    // 3秒後にメッセージをクリアするタイマーを設定
    timerRef.current = setTimeout(() => {
      setSuccessMessage("");
      timerRef.current = null;
    }, 3000);
  };

  const setAutoClearErrorMessage = () => {
    clearMessages();
    setIsErrFlg(true);

    // 3秒後に入力エラーメッセージをクリアするタイマーを設定
    timerRef.current = setTimeout(() => {
      setIsErrFlg(false);
      timerRef.current = null;
    }, 3000);
  };

  // --------------------------------------------------
  // R: データの取得 (Read)
  // --------------------------------------------------
  const fetchRecords = async () => {
    setIsLoading(true);

    try {
      const { data, error } = await supabaseClient
        .from(tableName)
        .select("id, title, time")
        .order("id", { ascending: false });

      if (error) {
        throw new Error(error.message);
      }
      setRecords(data || []);
    } catch (e) {
      console.error("Fetch Error:", e.message);
      setDbError(`🚨 データ取得エラー: ${e.message}`);
    } finally {
      setIsLoading(false);
    }
  };

  // 初期ロードはクライアントが初期化された後に一度だけ実行
  useEffect(() => {
    if (isSupabaseReady) {
      console.log("fetchRecords");
      fetchRecords();
    } else {
      setIsLoading(false);
    }
  }, [isSupabaseReady]);

  // --------------------------------------------------
  // C: データの登録 (Create)
  // --------------------------------------------------
  const register = async () => {
    const hoursValue = getNumericHours(hours);

    if (content.trim() === "" || hoursValue <= 0) {
      setAutoClearErrorMessage();
      console.log("Createエラー");
      return;
    }

    clearMessages();

    // 実行ガード
    if (!isSupabaseReady) {
      setDbError(
        "🚨 Supabaseクライアントが準備できていません。設定を確認してください。"
      );
      return;
    }

    const newRecordData = {
      title: content,
      time: hoursValue,
    };

    try {
      const { data, error } = await supabaseClient
        .from(tableName)
        .insert([newRecordData])
        .select();

      if (error) {
        throw new Error(error.message);
      }
      console.log(data.length);
      if (data && data.length > 0) {
        setRecords([data[0], ...records]);
        setAutoClearSuccessMessage("✅ データを Supabase に登録しました！");
        setContent("");
        setHours(0.5);
      }
    } catch (e) {
      console.error("Supabase Error:", e.message);
      setDbError(`🚨 登録エラー: ${e.message}`);
    }
  };

  const getNumericHours = (value) => {
    const num = parseFloat(value);
    return isNaN(num) ? 0 : num;
  };

  const handleContentChange = (e) => {
    setContent(e.target.value);
  };

  const handleHoursChange = (e) => {
    setHours(e.target.value);
  };

  const deleteRecord = async (id) => {
    const response = await supabaseClient.from(tableName).delete().eq("id", id);
    console.log(response);
    fetchRecords();
  };

  const totalHours = (Array.isArray(records) ? records : []).reduce(
    (sum, record) => sum + record.time,
    0
  );

  return (
    <>
      <div className="p-4 sm:p-8 max-w-lg mx-auto bg-gray-50 min-h-screen">
        <h1 className="text-3xl font-extrabold text-indigo-700 mb-6 text-center">
          学習時間記録テスト
        </h1>

        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100 mb-8">
          <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-2">
            学習入力
          </h2>

          {/* 成功メッセージ */}
          {successMessage && (
            <p className="p-3 mb-4 text-sm font-semibold text-green-700 bg-green-100 border border-green-300 rounded-lg transition-opacity duration-300 ease-out">
              {successMessage}
            </p>
          )}

          {dbError && (
            <p className="p-3 mb-4 text-sm font-semibold text-red-700 bg-red-100 border border-red-300 rounded-lg">
              {dbError}
              {isConfigMissing && (
                <span className="block mt-1 font-bold">
                  コード内の "YOUR_SUPABASE_URL" と "YOUR_SUPABASE_ANON_KEY"
                  を必ず置き換えてください。
                </span>
              )}
            </p>
          )}

          {isErrFlg && (
            <p className="p-3 mb-4 text-sm font-semibold text-red-700 bg-red-100 border border-red-300 rounded-lg">
              学習内容と時間を正しく入力してください。（時間は0より大きい値が必要です）
            </p>
          )}

          <div className="mb-4">
            <label
              htmlFor="learning-content"
              className="block text-sm font-medium text-gray-700 mb-1"
            >
              学習内容
            </label>
            <input
              type="text"
              id="learning-content"
              placeholder="学習内容を入力する"
              value={content}
              onChange={handleContentChange}
              className="w-full p-2 border border-gray-300 rounded-lg focus:ring-indigo-500 focus:border-indigo-500"
            />
          </div>

          <div className="mb-6 flex items-center space-x-2">
            <label
              htmlFor="learning-hours"
              className="text-sm font-medium text-gray-700"
            >
              学習時間
            </label>
            <input
              type="number"
              id="learning-hours"
              min="0"
              step="0.5"
              value={hours}
              onChange={handleHoursChange}
              className="w-20 p-2 border border-gray-300 rounded-lg text-right focus:ring-indigo-500 focus:border-indigo-500"
            />
            <span className="text-gray-600">時間</span>
          </div>
          <div>
            <div className="mb-6 flex items-center space-x-2">
              <span className="text-gray-600">入力されている学習内容：</span>
              <span>{content}</span>
            </div>

            <div className="mb-6 flex items-center space-x-2">
              <span className="text-gray-600">入力されている時間：</span>
              <span className="text-gray-600">{`${hours}時間`}</span>
            </div>
          </div>
          <button
            className="bg-indigo-600 text-white p-2.5 rounded-lg w-full font-bold hover:bg-indigo-700 transition shadow-md"
            onClick={register}
            disabled={isLoading || !isSupabaseReady}
          >
            {isLoading ? "ロード中..." : "🚀 登録"}
          </button>
        </div>

        <div className="bg-white p-6 rounded-xl shadow-lg border border-gray-100">
          <h2 className="text-2xl font-bold mb-4 text-gray-800 border-b pb-2">
            学習履歴
          </h2>
          <div className="mb-4 p-3 bg-indigo-50 rounded-lg flex justify-between items-center border border-indigo-200">
            <span className="font-bold text-indigo-800">合計時間：</span>
            <div className="flex items-baseline">
              <span className="text-indigo-600 text-3xl font-extrabold mr-1">
                {totalHours.toFixed(1)}
              </span>
              <span className="text-lg text-indigo-700">/ 1000(h)</span>
            </div>
          </div>
          <ul className="divide-y divide-gray-200">
            {records.length > 0 ? (
              records.map((record) => (
                <li
                  key={record.id}
                  className="flex justify-between items-center py-3"
                >
                  <>
                    <span className="flex-1 min-w-0 text-sm font-medium text-gray-800 truncate pr-4">
                      {record.title}
                    </span>

                    <span className="w-16 text-right font-bold text-lg text-gray-600 shrink-0">
                      {record.time}
                    </span>
                    <span className="text-lg text-gray-600 shrink-0 mr-4">
                      h
                    </span>

                    <div className="flex space-x-2 shrink-0">
                      <button
                        className="bg-red-500 text-white px-2.5 py-1.5 rounded-lg font-bold hover:bg-red-600 transition shadow-md text-xs disabled:bg-red-300"
                        onClick={() => deleteRecord(record.id)}
                      >
                        削除
                      </button>
                    </div>
                  </>
                </li>
              ))
            ) : (
              <li className="text-gray-500 italic py-3 text-center">
                まだ記録がありません。
              </li>
            )}
          </ul>
        </div>
      </div>
    </>
  );
};
