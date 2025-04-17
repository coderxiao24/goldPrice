// 引入必要的模块
const https = require("https");
const fs = require("fs").promises;
const url = require("url");
const path = require("path");

const { v4: uuidv4 } = require("uuid");
const fetch = require("node-fetch");

const kline_type_map = {
  1: "分钟",
  5: "小时",
  8: "日",
  9: "周",
  10: "月",
};

const kline_types = Object.keys(kline_type_map);

const directoryPath = path.join(__dirname, "outputs");

async function request(kline_type, reject) {
  const targetUrl = "https://quote.alltick.io/quote-b-api/kline";
  const queryParams = new URLSearchParams({
    token: process.env.API_TOKEN,
    query: JSON.stringify({
      trace: uuidv4(),
      data: {
        kline_type,
        code: "GOLD",
        kline_timestamp_end: 0,
        query_kline_num: 1000,
        adjust_type: 0,
      },
    }),
  });

  const url = `${targetUrl}?${queryParams.toString()}`;

  try {
    const response = await fetch(url);
    console.log(`请求结束${kline_type_map[kline_type]}K数据`);
    if (!response.ok) throw new Error(`HTTP error! status: ${response.status}`);
    const data = await response.text();

    const path = `${directoryPath}/${kline_type_map[kline_type]}K数据.json`;

    await fs.writeFile(path, data);
    console.log(`数据已成功写入${path}`);
  } catch (err) {
    clearInterval(timer);
    reject(new Error(`请求出错: ${err.message}`));
    throw new Error(`请求出错: ${err.message}`);
  }
}

let i = 0;
let timer = null;
async function getData(resolve, reject) {
  try {
    console.log(`开始请求${kline_type_map[kline_types[i]]}K数据`);
    await request(kline_types[i], reject);

    i++;
    if (i > kline_types.length - 1) {
      clearInterval(timer);
      console.log("全部请求结束");
      resolve();
      return;
    } else console.log(`11秒后请求下一个`);
  } catch (error) {
    clearInterval(timer);
    reject();
    throw new Error(error);
  }
}

async function deleteFiles(reject) {
  try {
    // 获取目标目录中的所有文件
    const files = await fs.readdir(directoryPath);

    // 遍历每个文件并尝试删除
    for (const file of files) {
      // 构建完整的文件路径
      const filePath = path.join(directoryPath, file);

      try {
        // 尝试删除文件
        await fs.unlink(filePath);
        console.log(`已删除文件: ${filePath}`);
      } catch (err) {
        clearInterval(timer);
        reject(new Error(`无法删除文件 ${filePath}:` + err.message));
      }
    }
  } catch (err) {
    clearInterval(timer);
    reject(new Error("无法扫描目录:" + err.message));
  }
}

exports.getGoldData = function main() {
  return new Promise(async (resolve, reject) => {
    try {
      await fs.stat(directoryPath);
      console.log("目录已存在:", directoryPath);
    } catch (err) {
      if (err.code === "ENOENT") {
        console.log("目录不存在:", directoryPath);
        await fs.mkdir(directoryPath, { recursive: true });
      }
    }

    await deleteFiles(reject);
    await getData(resolve, reject);
    timer = setInterval(async () => {
      await getData(resolve, reject);
    }, 1000 * 11);
  });
};
