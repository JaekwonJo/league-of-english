/**
 * StudyPage: ?????/???????β뼯援????????거?쭛??????곗뒭??????棺堉?댆洹ⓦ럹???????????
 */

import React, { useState, useEffect } from "react";
import { useAuth } from "../contexts/AuthContext";
import apiService, { api } from "../services/api.service";
import problemRegistry from "../services/problemRegistry";
import StudyConfig from "../components/study/StudyConfig";
import ProblemDisplay from "../components/study/ProblemDisplay";
import ScoreHUD from "../components/study/ScoreHUD";
import StudyResult from "../components/study/StudyResult";
import logger from "../utils/logger";

const StudyPage = () => {
  const { user } = useAuth();

  const [mode, setMode] = useState("config"); // config | study | result
  const [config, setConfig] = useState(null);
  const [problems, setProblems] = useState([]);
  const [currentIndex, setCurrentIndex] = useState(0);
  const [answers, setAnswers] = useState({});
  const [timeSpent, setTimeSpent] = useState({});
  const [results, setResults] = useState(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState(null);

  const [startTime, setStartTime] = useState(null);
  const [currentTime, setCurrentTime] = useState(null);
  const [timeLeft, setTimeLeft] = useState(120);

  useEffect(() => {
    if (mode === "study" && !startTime) {
      setStartTime(Date.now());
      const timer = setInterval(() => setCurrentTime(Date.now()), 1000);
      return () => clearInterval(timer);
    }
  }, [mode, startTime]);

  const getTierStep = () => {
    const order = ["Iron", "Bronze", "Silver", "Gold", "Platinum", "Diamond", "Master", "Challenger"];
    const tierName = String(user?.tier?.name || user?.tier || "").toLowerCase();
    const idx = order.findIndex((label) => label.toLowerCase() === tierName);
    return Math.max(0, idx);
  };

  const getBaseTimePerProblem = () => {
    const reduction = getTierStep() * 5;
    return Math.max(60, 120 - reduction);
  };

  useEffect(() => {
    if (mode === "study") setTimeLeft(getBaseTimePerProblem());
  }, [mode, currentIndex]);

  useEffect(() => {
    if (mode !== "study") return undefined;
    if (timeLeft <= 0) {
      if (currentIndex < problems.length - 1) {
        setCurrentIndex((idx) => idx + 1);
      } else {
        finishStudy();
      }
      return undefined;
    }
    const timer = setTimeout(() => setTimeLeft((prev) => prev - 1), 1000);
    return () => clearTimeout(timer);
  }, [mode, timeLeft, currentIndex, problems.length]);

  const startStudy = async (studyConfig) => {
    try {
      setLoading(true);
      setError(null);
      logger.info("Starting study with config:", studyConfig);

      const totalCount = Object.values(studyConfig.types || {}).reduce((sum, count) => sum + count, 0);
      const payload = {
        documentId: studyConfig.documentId,
        counts: studyConfig.types,
        orderDifficulty: studyConfig.orderDifficulty || "basic",
        insertionDifficulty: studyConfig.insertionDifficulty || "basic",
        grammarDifficulty: studyConfig.grammarDifficulty || "basic",
        totalCount: Math.max(1, totalCount || 1),
      };

      const response = await apiService.post("/generate/csat-set", payload);
      const processed = (response.problems || []).map((problem) => problemRegistry.executeHandler(problem.type, problem));

      if (!processed.length) {
        throw new Error("???筌???鶯ㅺ동??筌믡룓愿????怨쀫뎐????? ?轅붽틓??彛?臾믪뮏?鶯??????");
      }

      setProblems(processed);
      setConfig(studyConfig);
      setMode("study");
      setStartTime(Date.now());
      logger.info(`Loaded ${processed.length} problems`);
    } catch (err) {
      logger.error("Failed to start study:", err);
      const msg = err?.message || "";
      let clean;
      if (/404/.test(msg)) clean = "???筌?????쑩??낆땡??轅붽틓?????????????욱룏???????낆젵. ?????ㅻ쿋??????節떷???????용츧????ロ뒌??";
      else if (/503/.test(msg)) clean = "??癲ル슢캉???쭍??μ떝?띄몭?吏녶젆?빧???μ떝?띄몭??袁㏉떋???????낆젵. ??????뷂┼????????ㅻ쿋????癲ル슢?????????용츧????ロ뒌??";
      else if (/401/.test(msg) || /token|auth/i.test(msg)) clean = '?β돦裕??筌뤾쑴逾??熬곣뫗???紐껊퉵?? ???곕뻣 ?β돦裕?????怨삵룖?筌뤾쑴??';
      else clean = "????거????轅붽틓??影?뽧걤?????????⑤챷逾???ル봿?? ??ш끽維뽳쭩?좊쐪筌먲퐢?????????????낆젵. ?????ㅻ쿋????癲ル슢?????????용츧????ロ뒌??";
      setError(clean);
    } finally {
      setLoading(false);
    }
  };

  const handleAnswer = (answer) => {
    const elapsedForProblem = Date.now() - (startTime + (timeSpent[currentIndex] || 0));
    setAnswers((prev) => ({ ...prev, [currentIndex]: answer }));
    setTimeSpent((prev) => ({ ...prev, [currentIndex]: (prev[currentIndex] || 0) + elapsedForProblem }));
    logger.debug(`Answer submitted for problem ${currentIndex}:`, answer);
  };

  const nextProblem = () => {
    if (currentIndex < problems.length - 1) {
      setCurrentIndex((idx) => idx + 1);
    } else {
      finishStudy();
    }
  };

  const prevProblem = () => {
    if (currentIndex > 0) {
      setCurrentIndex((idx) => idx - 1);
    }
  };

  const finishStudy = async () => {
    try {
      setLoading(true);
      const studyResults = [];
      let totalCorrect = 0;
      let totalTime = 0;

      for (let i = 0; i < problems.length; i++) {
        const problem = problems[i];
        const userAnswer = answers[i];
        const spent = timeSpent[i] || 0;
        const isCorrect = String(problem.answer) === String(userAnswer);
        if (isCorrect) totalCorrect += 1;
        totalTime += spent;
        studyResults.push({
          problem,
          userAnswer,
          correct: isCorrect,
          timeSpent: Math.round(spent / 1000),
        });
      }

      const accuracy = problems.length ? Math.round((totalCorrect / problems.length) * 100) : 0;

      setResults({
        studyResults,
        totalProblems: problems.length,
        totalCorrect,
        accuracy,
        totalTime: Math.round(totalTime / 1000),
        earnedPoints: totalCorrect * 10 - (studyResults.length - totalCorrect) * 5,
      });

      setMode("result");
      logger.info("Study completed:", { totalCorrect, accuracy });
    } catch (err) {
      logger.error("Failed to finish study:", err);
      setError(err.message);
    } finally {
      setLoading(false);
    }
  };

  const restart = () => {
    setMode("config");
    setProblems([]);
    setCurrentIndex(0);
    setAnswers({});
    setTimeSpent({});
    setResults(null);
    setStartTime(null);
    setCurrentTime(null);
  };

  if (loading) {
    return (
      <div style={styles.loading}>
        <div style={styles.spinner}></div>
        <p>?轅붽틓??影?뽧걤????..</p>
      </div>
    );

  if (error) {
    return (
      <div style={styles.error}>
        <h2>??살첒 獄쏆뮇源?/h2>
        <p>{error}</p>
        <button onClick={restart} style={styles.button}>
          ??쇰뻻 ??뺣즲
        </button>
      </div>
    );
  }
  }

  switch (mode) {
    case "config":
      return <StudyConfig onStart={startStudy} />;

    case "study":
      return (
        <div style={{ maxWidth: 900, margin: "0 auto", padding: "16px" }}>
          <div style={{ display: "flex", justifyContent: "space-between", alignItems: "center", marginBottom: 8 }}>
            <button
              className="no-print"
              onClick={() => {
                if (window.confirm("??????거?쭛????????살꺎?????롪퍓肉?????濚밸Ŧ?????鶯ㅺ동??????????????沃섃뫗쨘????쎛????????????몃㎟?")) setMode("config");
              }}
              style={{ padding: "6px 10px", borderRadius: 8, border: "1px solid #e5e7eb", background: "#fff", cursor: "pointer" }}
            >
              ?????沃섃뫗쨘????쎛??            </button>
            <ScoreHUD timeElapsed={currentTime ? Math.round((currentTime - startTime) / 1000) : 0} />
          </div>
          <ProblemDisplay
            problem={problems[currentIndex]}
            currentIndex={currentIndex}
            totalProblems={problems.length}
            userAnswer={answers[currentIndex]}
            onAnswer={handleAnswer}
            onNext={nextProblem}
            onPrev={prevProblem}
            onFinish={finishStudy}
            timeElapsed={currentTime ? Math.round((currentTime - startTime) / 1000) : 0}
            timeLeft={timeLeft}
          />
        </div>
      );

    case "result":
      return <StudyResult results={results} onRestart={restart} onHome={() => (window.location.href = "/")} />;

    default:
      return null;
  }
};

const styles = {
  loading: {
    display: "flex",
    flexDirection: "column",
    alignItems: "center",
    justifyContent: "center",
    minHeight: "400px",
  },
  spinner: {
    width: "40px",
    height: "40px",
    border: "4px solid #f3f4f6",
    borderTop: "4px solid #667eea",
    borderRadius: "50%",
    animation: "spin 1s linear infinite",
  },
  error: {
    textAlign: "center",
    padding: "40px",
    background: "white",
    borderRadius: "20px",
    maxWidth: "500px",
    margin: "50px auto",
    boxShadow: "0 10px 30px rgba(0, 0, 0, 0.1)",
  },
  button: {
    padding: "12px 24px",
    background: "linear-gradient(135deg, #667eea 0%, #764ba2 100%)",
    color: "white",
    border: "none",
    borderRadius: "10px",
    fontSize: "16px",
    fontWeight: "bold",
    cursor: "pointer",
    marginTop: "20px",
  },
};

export default StudyPage;

