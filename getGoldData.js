const fs = require("fs").promises;
const path = require("path");
const { v4: uuidv4 } = require("uuid");
const fetch = require("node-fetch");

// 配置常量
const KLINE_TYPE_LABELS = {
  1: "分钟",
  5: "小时",
  8: "日",
  9: "周",
  10: "月",
};
const REQUEST_INTERVAL_MS = 11000;
const directoryPath = path.join(__dirname, "outputs");

async function request(klineType) {
  const API_URL = "https://quote.alltick.io/quote-b-api/kline";
  const query = {
    trace: uuidv4(),
    data: {
      kline_type: klineType,
      code: "GOLD",
      kline_timestamp_end: 0,
      query_kline_num: 1000,
      adjust_type: 0,
    },
  };

  try {
    const response = await fetch(
      `${API_URL}?${new URLSearchParams({
        token: process.env.API_TOKEN,
        query: JSON.stringify(query),
      })}`
    );

    if (!response.ok) {
      throw new Error(`HTTP ${response.status}: ${response.statusText}`);
    }

    const filename = `${KLINE_TYPE_LABELS[klineType]}K数据.json`;
    const filePath = path.join(directoryPath, filename);
    await fs.writeFile(filePath, await response.text());

    console.log(`✅ ${filename} 已保存`);
    return true;
  } catch (err) {
    throw new Error(
      `${KLINE_TYPE_LABELS[klineType]}K数据请求失败: ${err.message}`
    );
  }
}

async function fetchKlinesSequentially() {
  const klineTypes = Object.keys(KLINE_TYPE_LABELS);

  for (const [index, klineType] of klineTypes.entries()) {
    try {
      console.log(`开始请求${KLINE_TYPE_LABELS[klineType]}K数据`);
      await request(klineType);
      if (index !== klineTypes.length - 1) {
        console.log(`${REQUEST_INTERVAL_MS / 1000}秒后请求下一个`);
        await new Promise((resolve) =>
          setTimeout(resolve, REQUEST_INTERVAL_MS)
        );
      }
    } catch (error) {
      throw error; // 错误处理交给上层
    }
  }
  console.log("全部请求结束");
}

// 清空输出目录
async function clearOutputDirectory() {
  try {
    // 首先读取目录的内容
    const entries = await fs.readdir(directoryPath, { withFileTypes: true });

    // 对于每一个条目，构建完整路径并删除
    const deletePromises = entries.map(async (entry) => {
      const fullPath = `${directoryPath}/${entry.name}`;
      if (entry.isDirectory()) {
        // 如果是子目录，递归删除
        return fs.rm(fullPath, { recursive: true, force: true });
      } else {
        // 如果是文件，则直接删除
        return fs.unlink(fullPath);
      }
    });

    // 等待所有删除操作完成
    await Promise.all(deletePromises);

    console.log(`已清空输出目录下的内容: ${directoryPath}`);
  } catch (err) {
    throw new Error(`目录内容清理失败: ${err.message}`);
  }
}

// 检查目录存在性
async function checkDirectoryExists() {
  try {
    await fs.access(directoryPath);
    return true;
  } catch {
    return false;
  }
}

exports.getGoldData = async function main() {
  try {
    if (!(await checkDirectoryExists())) {
      await fs.mkdir(directoryPath, { recursive: true });
      console.log("已创建目录:", directoryPath);
    }

    await clearOutputDirectory();
    await fetchKlinesSequentially();
    console.log("✅ 所有数据获取完成");
  } catch (error) {
    console.error("❌ 程序异常终止:", error.message);
    throw error;
  }
};
