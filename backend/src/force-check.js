"use strict";
var __awaiter = (this && this.__awaiter) || function (thisArg, _arguments, P, generator) {
    function adopt(value) { return value instanceof P ? value : new P(function (resolve) { resolve(value); }); }
    return new (P || (P = Promise))(function (resolve, reject) {
        function fulfilled(value) { try { step(generator.next(value)); } catch (e) { reject(e); } }
        function rejected(value) { try { step(generator["throw"](value)); } catch (e) { reject(e); } }
        function step(result) { result.done ? resolve(result.value) : adopt(result.value).then(fulfilled, rejected); }
        step((generator = generator.apply(thisArg, _arguments || [])).next());
    });
};
var __generator = (this && this.__generator) || function (thisArg, body) {
    var _ = { label: 0, sent: function() { if (t[0] & 1) throw t[1]; return t[1]; }, trys: [], ops: [] }, f, y, t, g = Object.create((typeof Iterator === "function" ? Iterator : Object).prototype);
    return g.next = verb(0), g["throw"] = verb(1), g["return"] = verb(2), typeof Symbol === "function" && (g[Symbol.iterator] = function() { return this; }), g;
    function verb(n) { return function (v) { return step([n, v]); }; }
    function step(op) {
        if (f) throw new TypeError("Generator is already executing.");
        while (g && (g = 0, op[0] && (_ = 0)), _) try {
            if (f = 1, y && (t = op[0] & 2 ? y["return"] : op[0] ? y["throw"] || ((t = y["return"]) && t.call(y), 0) : y.next) && !(t = t.call(y, op[1])).done) return t;
            if (y = 0, t) op = [op[0] & 2, t.value];
            switch (op[0]) {
                case 0: case 1: t = op; break;
                case 4: _.label++; return { value: op[1], done: false };
                case 5: _.label++; y = op[1]; op = [0]; continue;
                case 7: op = _.ops.pop(); _.trys.pop(); continue;
                default:
                    if (!(t = _.trys, t = t.length > 0 && t[t.length - 1]) && (op[0] === 6 || op[0] === 2)) { _ = 0; continue; }
                    if (op[0] === 3 && (!t || (op[1] > t[0] && op[1] < t[3]))) { _.label = op[1]; break; }
                    if (op[0] === 6 && _.label < t[1]) { _.label = t[1]; t = op; break; }
                    if (t && _.label < t[2]) { _.label = t[2]; _.ops.push(op); break; }
                    if (t[2]) _.ops.pop();
                    _.trys.pop(); continue;
            }
            op = body.call(thisArg, _);
        } catch (e) { op = [6, e]; y = 0; } finally { f = t = 0; }
        if (op[0] & 5) throw op[1]; return { value: op[0] ? op[1] : void 0, done: true };
    }
};
var __importDefault = (this && this.__importDefault) || function (mod) {
    return (mod && mod.__esModule) ? mod : { "default": mod };
};
Object.defineProperty(exports, "__esModule", { value: true });
var viem_1 = require("viem");
var client_1 = require("@prisma/client");
var config_1 = require("./config");
var dotenv_1 = __importDefault(require("dotenv"));
var path_1 = __importDefault(require("path"));
// Load env variables
var envPath = path_1.default.resolve(__dirname, '../.env.local');
dotenv_1.default.config({ path: envPath });
// Setup DB and client
var prisma = new client_1.PrismaClient();
var publicClient = (0, viem_1.createPublicClient)({
    chain: config_1.monadTestnetChain,
    transport: (0, viem_1.http)(),
});
// Setting up wallet addresses to check (lowercase for consistency)
var walletToCheck = "0xa6a4ec0f671b37ac51ad6ce7972d1fd81f3cda75";
var contractAddress = config_1.LILNAD_NFT_CONTRACT_ADDRESS.toLowerCase();
function checkOwnershipAndUpdateDB() {
    return __awaiter(this, void 0, void 0, function () {
        var balanceOf, latestTokenId, ownedTokens, i, owner, sbtInfo, error_1, error_2, error_3;
        return __generator(this, function (_a) {
            switch (_a.label) {
                case 0:
                    _a.trys.push([0, 16, 17, 19]);
                    console.log("Starting force check for wallet: ".concat(walletToCheck));
                    console.log("Using contract address: ".concat(contractAddress));
                    return [4 /*yield*/, publicClient.readContract({
                            address: config_1.LILNAD_NFT_CONTRACT_ADDRESS,
                            abi: config_1.LILNAD_NFT_ABI,
                            functionName: 'balanceOf',
                            args: [walletToCheck],
                        })];
                case 1:
                    balanceOf = _a.sent();
                    console.log("Wallet ".concat(walletToCheck, " has ").concat(balanceOf, " tokens from contract ").concat(contractAddress));
                    if (balanceOf === 0n) {
                        console.log('No tokens owned by this wallet. Nothing to update.');
                        return [2 /*return*/];
                    }
                    _a.label = 2;
                case 2:
                    _a.trys.push([2, 14, , 15]);
                    return [4 /*yield*/, publicClient.readContract({
                            address: config_1.LILNAD_NFT_CONTRACT_ADDRESS,
                            abi: config_1.LILNAD_NFT_ABI,
                            functionName: 'currentTokenId',
                        })];
                case 3:
                    latestTokenId = _a.sent();
                    console.log("Latest token ID from contract: ".concat(latestTokenId));
                    // Create the user record if it doesn't exist
                    return [4 /*yield*/, prisma.user.upsert({
                            where: { address: walletToCheck },
                            update: {}, // No updates needed if user exists
                            create: { address: walletToCheck },
                        })];
                case 4:
                    // Create the user record if it doesn't exist
                    _a.sent();
                    ownedTokens = [];
                    i = 1n;
                    _a.label = 5;
                case 5:
                    if (!(i <= latestTokenId)) return [3 /*break*/, 13];
                    _a.label = 6;
                case 6:
                    _a.trys.push([6, 11, , 12]);
                    return [4 /*yield*/, publicClient.readContract({
                            address: config_1.LILNAD_NFT_CONTRACT_ADDRESS,
                            abi: config_1.LILNAD_NFT_ABI,
                            functionName: 'ownerOf',
                            args: [i],
                        })];
                case 7:
                    owner = _a.sent();
                    if (!(owner.toLowerCase() === walletToCheck)) return [3 /*break*/, 10];
                    ownedTokens.push(i);
                    return [4 /*yield*/, publicClient.readContract({
                            address: config_1.LILNAD_NFT_CONTRACT_ADDRESS,
                            abi: config_1.LILNAD_NFT_ABI,
                            functionName: 'sbtInfo',
                            args: [i],
                        })];
                case 8:
                    sbtInfo = _a.sent();
                    console.log("Token #".concat(i, " owned by ").concat(walletToCheck, ", rank: ").concat(sbtInfo.rank));
                    // Update the DB record for this token
                    return [4 /*yield*/, prisma.lilnadNft.upsert({
                            where: {
                                contractAddress_tokenId: {
                                    contractAddress: contractAddress,
                                    tokenId: i.toString(),
                                }
                            },
                            update: {
                                ownerAddress: walletToCheck,
                                rank: sbtInfo.rank,
                            },
                            create: {
                                tokenId: i.toString(),
                                ownerAddress: walletToCheck,
                                contractAddress: contractAddress,
                                rank: sbtInfo.rank,
                                mintTimestamp: new Date(),
                            },
                        })];
                case 9:
                    // Update the DB record for this token
                    _a.sent();
                    _a.label = 10;
                case 10: return [3 /*break*/, 12];
                case 11:
                    error_1 = _a.sent();
                    // Skip non-existent tokens
                    console.log("Error checking token #".concat(i, ": ").concat(error_1.message));
                    return [3 /*break*/, 12];
                case 12:
                    i++;
                    return [3 /*break*/, 5];
                case 13:
                    console.log("Found ".concat(ownedTokens.length, " tokens owned by ").concat(walletToCheck, ":"));
                    console.log(ownedTokens.map(function (id) { return id.toString(); }));
                    return [3 /*break*/, 15];
                case 14:
                    error_2 = _a.sent();
                    console.error("Error fetching token data: ".concat(error_2.message));
                    return [3 /*break*/, 15];
                case 15: return [3 /*break*/, 19];
                case 16:
                    error_3 = _a.sent();
                    console.error("Error in force check:", error_3);
                    return [3 /*break*/, 19];
                case 17: return [4 /*yield*/, prisma.$disconnect()];
                case 18:
                    _a.sent();
                    return [7 /*endfinally*/];
                case 19: return [2 /*return*/];
            }
        });
    });
}
// Run the check
checkOwnershipAndUpdateDB()
    .then(function () { return console.log('Force check completed'); })
    .catch(function (e) { return console.error('Force check failed:', e); });
