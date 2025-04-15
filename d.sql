-- phpMyAdmin SQL Dump
-- version 5.2.2
-- https://www.phpmyadmin.net/
--
-- Host: localhost
-- Generation Time: Apr 16, 2025 at 03:10 AM
-- Server version: 8.0.41-0ubuntu0.22.04.1
-- PHP Version: 8.1.2-1ubuntu2.21

SET SQL_MODE = "NO_AUTO_VALUE_ON_ZERO";
START TRANSACTION;
SET time_zone = "+00:00";

--
-- Database: `trading_bot`
--

-- --------------------------------------------------------

--
-- Table structure for table `admin_login`
--

CREATE TABLE `admin_login` (
  `id` int NOT NULL,
  `email_login` varchar(100) NOT NULL,
  `password_login` varchar(100) NOT NULL,
  `access_code` varchar(40) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `api_key`
--

CREATE TABLE `api_key` (
  `id` int NOT NULL,
  `user_account` int NOT NULL,
  `exchange` varchar(50) NOT NULL,
  `pr_api_key` varchar(100) NOT NULL,
  `pr_api_secret` varchar(100) NOT NULL,
  `pr_api_phasprase` varchar(100) NOT NULL,
  `dm_api_key` varchar(100) NOT NULL,
  `dm_api_secret` varchar(100) NOT NULL,
  `dm_api_phasprase` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `api_key`
--

INSERT INTO `api_key` (`id`, `user_account`, `exchange`, `pr_api_key`, `pr_api_secret`, `pr_api_phasprase`, `dm_api_key`, `dm_api_secret`, `dm_api_phasprase`) VALUES
(1, 2, 'OKX', 'd22f6ae4-ecac-44ed-a2b0-c24393425077', '163EA0627D32CDBC2BF85D24AD6745B4', 'Sahabat1234!', 'e886a68f-6b1f-4c08-b9b2-01b364f86837', '699977545FB8F004DBE6868C10EA65C4', 'Sahabat1234!'),
(2, 2, 'BINANCE', 'LabPB56yAa6Zh9cW3ZGWRn9EJ1TX59SE6p1WWgIoa690riWIJIFDCO8v1gqWOzwM', 'aWcucZpYuG7BfrfaIUft9Dxtq64iJbS1mT6ycsxAx1HX9aVHWAba3zLmcPlAV1Xj', '', '', '', ''),
(3, 2, 'BYBIT', 'jN2RkH7ViKAbsU8GFw', 'zTJaF1IszLjVsajs4QEKlInXHkBqx7EyJYbu', '', '', '', '');

-- --------------------------------------------------------

--
-- Table structure for table `bot_logs`
--

CREATE TABLE `bot_logs` (
  `id` int NOT NULL,
  `message` text NOT NULL,
  `timestamp` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `exchange`
--

CREATE TABLE `exchange` (
  `id` int NOT NULL,
  `name` varchar(10) NOT NULL,
  `url` varchar(100) NOT NULL,
  `ws` varchar(100) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `exchange`
--

INSERT INTO `exchange` (`id`, `name`, `url`, `ws`) VALUES
(1, 'OKX', 'https://www.okx.com', 'wss://ws.okx.com:8443/ws/v5');

-- --------------------------------------------------------

--
-- Table structure for table `messages`
--

CREATE TABLE `messages` (
  `id` int NOT NULL,
  `name` varchar(255) DEFAULT NULL,
  `content` text,
  `createdAt` timestamp NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `messages`
--

INSERT INTO `messages` (`id`, `name`, `content`, `createdAt`) VALUES
(1, 'Ayam panggang', 'test', '2025-04-06 13:13:04'),
(2, 'yassuki', 'asasasas', '2025-04-06 13:15:04'),
(3, 'Ayam panggang', 'kokoko', '2025-04-06 14:04:57'),
(4, 'sss', 'ssss', '2025-04-06 15:06:54'),
(5, 'yassuki', 'asasas', '2025-04-06 15:12:53');

-- --------------------------------------------------------

--
-- Table structure for table `pairs`
--

CREATE TABLE `pairs` (
  `id` int NOT NULL,
  `pair_a` varchar(10) NOT NULL,
  `pair_b` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'USDT',
  `isactive` int NOT NULL DEFAULT '1'
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `pairs`
--

INSERT INTO `pairs` (`id`, `pair_a`, `pair_b`, `isactive`) VALUES
(1, 'BTC', 'USDT', 1),
(2, 'ETH', 'USDT', 1),
(3, 'XRP', 'USDT', 1),
(4, 'SOL', 'USDT', 1),
(5, 'ADA', 'USDT', 1),
(6, 'DOT', 'USDT', 1),
(7, 'DOGE', 'USDT', 1);

-- --------------------------------------------------------

--
-- Table structure for table `sessions`
--

CREATE TABLE `sessions` (
  `session_id` varchar(128) CHARACTER SET utf8mb4 COLLATE utf8mb4_bin NOT NULL,
  `expires` int UNSIGNED NOT NULL,
  `data` mediumtext CHARACTER SET utf8mb4 COLLATE utf8mb4_bin
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `sessions`
--

INSERT INTO `sessions` (`session_id`, `expires`, `data`) VALUES
('I7PpEIAjuvjGcwIAsqYRnRor0s91hb7N', 1744833813, '{\"cookie\":{\"originalMaxAge\":86400000,\"expires\":\"2025-04-16T15:19:03.024Z\",\"secure\":false,\"httpOnly\":true,\"path\":\"/\",\"sameSite\":\"lax\"},\"passport\":{\"user\":2}}');

-- --------------------------------------------------------

--
-- Table structure for table `strategy`
--

CREATE TABLE `strategy` (
  `id` int NOT NULL,
  `user_account` int NOT NULL,
  `risk_per_trade` decimal(10,0) NOT NULL,
  `max_consecutive_lost` decimal(10,0) NOT NULL,
  `max_daily_draw_down` decimal(10,0) NOT NULL,
  `daily_profit_target` decimal(10,0) NOT NULL,
  `stopDistance_atr` decimal(10,0) NOT NULL,
  `takeProfitDistance_atr` decimal(10,0) NOT NULL,
  `lastRSI` decimal(10,0) NOT NULL,
  `volumeRatio` decimal(10,0) NOT NULL,
  `fibLevels` decimal(10,0) NOT NULL,
  `mbs` decimal(10,0) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `strategy`
--

INSERT INTO `strategy` (`id`, `user_account`, `risk_per_trade`, `max_consecutive_lost`, `max_daily_draw_down`, `daily_profit_target`, `stopDistance_atr`, `takeProfitDistance_atr`, `lastRSI`, `volumeRatio`, `fibLevels`, `mbs`) VALUES
(1, 1, 0, 5, 1, 1, 1, 4, 30, 1, 1, 3);

-- --------------------------------------------------------

--
-- Table structure for table `trades`
--

CREATE TABLE `trades` (
  `id` int NOT NULL,
  `user_account` int NOT NULL,
  `trade_time` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `entry_price` decimal(10,0) NOT NULL,
  `exchange_trade_id` varchar(100) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `symbol` varchar(20) DEFAULT NULL,
  `side` varchar(4) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `quantity` decimal(10,5) DEFAULT NULL,
  `sl` decimal(10,5) DEFAULT NULL,
  `tp` decimal(10,0) NOT NULL,
  `isClose` int NOT NULL,
  `close_time` datetime DEFAULT NULL,
  `pnl` decimal(10,0) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `trailing_sl`
--

CREATE TABLE `trailing_sl` (
  `id` int NOT NULL,
  `user_account` int NOT NULL,
  `trade_id` varchar(20) NOT NULL,
  `trailing_date` datetime NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `last_sl` decimal(10,0) NOT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

-- --------------------------------------------------------

--
-- Table structure for table `users`
--

CREATE TABLE `users` (
  `id` int NOT NULL,
  `name` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `email` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `password` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `phone_number` int DEFAULT NULL,
  `fav_pair` text CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci,
  `laverage` int NOT NULL DEFAULT '10',
  `margin_mode` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'cross',
  `telegram_chat_id` varchar(20) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `isdemo` int NOT NULL DEFAULT '0',
  `profile_picture` varchar(255) NOT NULL,
  `email_verified` int NOT NULL,
  `phone_verified` int NOT NULL DEFAULT '0',
  `resetToken` varchar(100) DEFAULT NULL,
  `resetTokenExpires` timestamp NULL DEFAULT NULL,
  `provider` varchar(10) NOT NULL,
  `providerId` varchar(50) NOT NULL,
  `default_exchange` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'okx',
  `default_pair` varchar(10) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL DEFAULT 'BTC-USDT',
  `googleId` varchar(255) DEFAULT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT NULL,
  `deleted_at` timestamp NULL DEFAULT NULL
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `users`
--

INSERT INTO `users` (`id`, `name`, `email`, `password`, `phone_number`, `fav_pair`, `laverage`, `margin_mode`, `telegram_chat_id`, `isdemo`, `profile_picture`, `email_verified`, `phone_verified`, `resetToken`, `resetTokenExpires`, `provider`, `providerId`, `default_exchange`, `default_pair`, `googleId`, `created_at`, `updated_at`, `deleted_at`) VALUES
(2, 'Nuryadi yassuki', 'n.yassuki@gmail.com', NULL, 1234567890, NULL, 10, 'cross', NULL, 1, 'https://lh3.googleusercontent.com/-aYOeyrr69Zk/AAAAAAAAAAI/AAAAAAAAAAA/ALKGfkmPb5s2Ep5BY7iE-L01pB4yF1sxvA/s128-c/photo.jpg', 1, 1, NULL, NULL, 'google', '', 'binance', 'ETH-USDT', '101957392757122008189', '2025-04-11 12:03:42', NULL, NULL),
(3, 'ayam panggang', 'ayam.panggang.juara@gmail.com', '$2b$10$JbF2keRATWxlu3TrwNKHl.SOymWGgLyP61BogQ8ryZMGI.VJNQJ4u', NULL, NULL, 10, 'cross', NULL, 0, '', 0, 0, NULL, NULL, '', '', 'okx', 'BTC-USDT', NULL, '2025-04-11 12:03:42', NULL, NULL),
(11, 'sakip guard', 'sakip.guard@gmail.com', NULL, NULL, NULL, 10, 'cross', NULL, 0, 'https://lh3.googleusercontent.com/a/ACg8ocLzPwuibxiMQPogZkfTtdK2KSmX25WHL5lu8xkZPBI30ahVHbo=s96-c', 1, 0, NULL, NULL, 'google', '100867020313802245005', 'okx', 'BTC-USDT', NULL, '2025-04-15 15:07:30', NULL, NULL);

-- --------------------------------------------------------

--
-- Table structure for table `user_wallet`
--

CREATE TABLE `user_wallet` (
  `id` int NOT NULL,
  `user_account` int NOT NULL,
  `token` varchar(10) NOT NULL,
  `eaddress` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `private_key` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci NOT NULL,
  `mnemonic` varchar(255) CHARACTER SET utf8mb4 COLLATE utf8mb4_0900_ai_ci DEFAULT NULL,
  `network` varchar(10) NOT NULL,
  `created_at` timestamp NOT NULL DEFAULT CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `user_wallet`
--

INSERT INTO `user_wallet` (`id`, `user_account`, `token`, `eaddress`, `private_key`, `mnemonic`, `network`, `created_at`) VALUES
(6, 2, 'USDT', '0x188DabFFefAC086FB2D7494E824BeA96c33Cc99e', '0x8c1f54abf8981492b525efffe0f3bfbca89587ee025ec6b82db34bbcabd64411', 'any mouse else debate hawk sunset cool similar useless nephew effort kind', 'ERC20', '2025-04-11 07:02:11'),
(7, 2, 'USDT', 'TAXdt8iXjcjsgsRYjpQGqJGyLc1UXm68md', 'f04b5f09185c2cd59f1305ef5220a03a52713e30eb8cad5952e47081129c0529', 'any mouse else debate hawk sunset cool similar useless nephew effort kind', 'TRC20', '2025-04-11 07:02:11'),
(17, 2, 'BTC', '{\"p2pkh\":\"mikL6kPEpdPiuUeUMFRhqu1TbgTxkNq9Sz\",\"p2wpkh\":\"tb1qydhlegz2x8z5t4v7c0fryhdmgqmvrygweht4u9\",\"p2sh\":\"2N8w6jP7LX21n62zVgcQC4KyGSwRLN3uX5z\"}', '155,130,28,248,2,1,159,118,128,199,8,66,163,21,218,18,252,203,145,73,12,146,82,194,32,73,155,1,242,146,129,226', 'light brisk degree endorse arrow friend build enhance weasel word emotion puzzle movie worry wash misery usual bottom guide various dwarf hungry husband attack', 'testnet', '2025-04-11 08:24:23'),
(18, 4, 'USDT', '0xb5007596192b8eAa0e3E2165e2c38f06F8273613', '0x7a2b3fe00892188a2413427a4b8a5eec2e786e0b7810ea91a8d50e1df4834464', 'year offer rifle gun dash step comfort card piece vacuum target monster', 'ERC20', '2025-04-12 13:10:22'),
(19, 4, 'USDT', 'TNpbgfTLKJ6EoRKHGwJq8cj1mpiifJcyic', '53eafd6b45dd8c76539142eae8b1f853ed3bdd2de769f025baa572d321e2ac83', 'year offer rifle gun dash step comfort card piece vacuum target monster', 'TRC20', '2025-04-12 13:10:22'),
(20, 4, 'BTC', '{\"p2pkh\":\"moDzhNVwMBtSaBZv7zJ3wDBwAXtACDjFKp\",\"p2wpkh\":\"tb1q2j9lpfwx3u3gmc8fwzs3nu34485j2p5l0hd62u\",\"p2sh\":\"2N9TbkAPNhxgFngXWR3p13WtVAgQhKvGVLW\"}', '74,74,110,64,9,54,178,49,131,55,27,187,79,11,157,169,221,166,204,63,108,145,62,19,252,27,26,247,166,98,129,65', 'below crane weather fabric motion during alpha measure forget easy august denial cabin life lock sunset turtle tourist dress pluck weapon other excuse wash', 'testnet', '2025-04-12 13:10:23'),
(21, 3, 'USDT', '0x9a6C71ff298A1AA9dE31141a3671eFf67e070667', '0x4e51dd1c4af4da9930516866873c903e3cdb013dbfbb2342e9d2aad4275de64a', 'garlic topic dilemma wheat finish powder hover kit more close leisure guard', 'ERC20', '2025-04-12 20:56:08'),
(22, 3, 'USDT', 'TTZqVLbRdY8yDTULna5uPUdFUakHnnVtf2', 'f6070cd5f3788aa93a160932f71c182e48b8fee67d474866d6e58253983fb665', 'garlic topic dilemma wheat finish powder hover kit more close leisure guard', 'TRC20', '2025-04-12 20:56:08'),
(23, 3, 'BTC', '{\"p2pkh\":\"mi3zsJvkDHna3463rwXX7B7j8x1p3YrUAu\",\"p2wpkh\":\"tb1qr085kejnr40ut8mxul5mad6qnvwg8fdw7ewhqe\",\"p2sh\":\"2MsHuPfxfCjPc5o5zTYyKdxYeNuCWA7bLng\"}', '119,193,130,110,35,57,38,247,12,2,134,59,128,155,228,10,115,18,4,39,32,169,142,215,218,255,52,11,35,115,84,185', 'earth magic rib easily light process barely dutch stone combine hungry stuff mobile matrix doctor until rural endorse century float priority drift pencil sniff', 'testnet', '2025-04-12 20:56:08'),
(24, 10, 'USDT', '0x32631c37742B81a964d9882Ac6cAeD85CA8c7647', '0x6feca01f6992e8cf5dc17987697e73a3916775e06940f3aa8ab8411c3b31e2fb', 'assist monster juice near punch boss cricket confirm damp ignore gift almost', 'ERC20', '2025-04-13 17:12:01'),
(25, 10, 'USDT', 'TKqxYeHHKaaMY7hquTw4r9wQSqDfDe9CE2', '448334c78c080c23a0b34d54c6967eddc4782a544670bf3aa9a6dc903cf23e5e', 'assist monster juice near punch boss cricket confirm damp ignore gift almost', 'TRC20', '2025-04-13 17:12:01'),
(26, 10, 'BTC', '{\"p2pkh\":\"mtwFbcrq99XmH1HMsvVaBKS5X2s8cQL2dF\",\"p2wpkh\":\"tb1qjveqlh9z9dkvs3zlsh9ml9ywlnr5hckfaje5hh\",\"p2sh\":\"2NEyhJXr9Row5MazwfZ36JDnwXRZRMC9nNo\"}', '149,38,234,233,167,154,243,160,69,70,149,87,91,228,119,44,86,4,242,30,154,117,54,36,129,6,175,25,6,154,71,176', 'island adjust harbor toe cover town spread middle aisle stock accuse quick merit guess cable ramp absorb urban wide when message reason barrel exit', 'testnet', '2025-04-13 17:12:02'),
(27, 11, 'USDT', '0xe9e4fc5CAA7ab521036DF3277Da3d5437788BeC0', '0x9899314dfdbff6db0180a09e9a819d0c3e970776398f515c867bdf129826318f', 'dial guess similar banana degree guide illness right good march burden exhibit', 'ERC20', '2025-04-15 15:07:41'),
(28, 11, 'USDT', 'TChQ1DnFRZrBoLjiqg9hBNCnHMHEjW2xw3', '7728f3c5c5bd29de01bf9e53ceedaaaba3ca7c5c7c026580a2e4259946442ce0', 'dial guess similar banana degree guide illness right good march burden exhibit', 'TRC20', '2025-04-15 15:07:41'),
(29, 11, 'BTC', '{\"p2pkh\":\"mttVXrk4q4F2SJ4awpGKVZAGGCrN6aeQjH\",\"p2wpkh\":\"tb1qj2k8y50rd0f3v2xqkhvnlk2mv5rxlmkt9g5evv\",\"p2sh\":\"2NEYA3GPu3ZDnsDGz7hve6vQh2enUN6GPQJ\"}', '132,153,91,87,58,203,200,35,171,43,177,16,4,254,224,142,140,171,36,210,23,141,164,118,239,208,123,158,250,106,67,26', 'warm car salon faculty weird fog miss purpose range rely ritual feed into nerve honey accuse garage appear review nephew return hundred input culture', 'testnet', '2025-04-15 15:07:41');

-- --------------------------------------------------------

--
-- Table structure for table `walletconnect_sessions`
--

CREATE TABLE `walletconnect_sessions` (
  `id` int NOT NULL,
  `user_account` int NOT NULL,
  `session_topic` varchar(255) NOT NULL,
  `pairing_topic` varchar(255) DEFAULT NULL,
  `session_data` longtext NOT NULL,
  `wallet_address` varchar(42) DEFAULT NULL,
  `created_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP,
  `updated_at` timestamp NULL DEFAULT CURRENT_TIMESTAMP ON UPDATE CURRENT_TIMESTAMP
) ENGINE=InnoDB DEFAULT CHARSET=utf8mb4 COLLATE=utf8mb4_0900_ai_ci;

--
-- Dumping data for table `walletconnect_sessions`
--

INSERT INTO `walletconnect_sessions` (`id`, `user_account`, `session_topic`, `pairing_topic`, `session_data`, `wallet_address`, `created_at`, `updated_at`) VALUES
(60, 2, '7f8b05ff6e6d1a8cd94851e8c59e2f8313c9cfcbc4b8d00e3e6d3ad43e7fdaad', 'edc5b6460843ef7de28e97d58122dc96ab36ee17d73968fce69fab6b6556e349', '{\"topic\":\"7f8b05ff6e6d1a8cd94851e8c59e2f8313c9cfcbc4b8d00e3e6d3ad43e7fdaad\",\"relay\":{\"protocol\":\"irn\"},\"expiry\":1745138780,\"namespaces\":{\"eip155\":{\"chains\":[\"eip155:1\",\"eip155:56\",\"eip155:137\"],\"accounts\":[\"eip155:1:0x1be4e12e9d2b36374ac8db8437ddc4f2f33c63c0\",\"eip155:56:0x1be4e12e9d2b36374ac8db8437ddc4f2f33c63c0\",\"eip155:137:0x1be4e12e9d2b36374ac8db8437ddc4f2f33c63c0\"],\"methods\":[\"eth_sendTransaction\",\"personal_sign\",\"eth_sign\"],\"events\":[\"accountsChanged\",\"chainChanged\"]}},\"acknowledged\":true,\"pairingTopic\":\"edc5b6460843ef7de28e97d58122dc96ab36ee17d73968fce69fab6b6556e349\",\"requiredNamespaces\":{\"eip155\":{\"methods\":[\"eth_sendTransaction\",\"personal_sign\",\"eth_sign\"],\"chains\":[\"eip155:1\",\"eip155:56\",\"eip155:137\"],\"events\":[\"accountsChanged\",\"chainChanged\"]}},\"optionalNamespaces\":{},\"controller\":\"59167a9980e2537008a6f7fabbb8244677822496405d1d59e65b9625db8e6158\",\"self\":{\"publicKey\":\"413acc94e760dd5226e7c84988c7054e862972f805d146fedf7509de600db279\",\"metadata\":{\"name\":\"YASSUKI-Exchange\",\"description\":\"Multi exchange wallet terminal\",\"url\":\"https://multi-exchange.terminal\",\"icons\":[\"https://0.academia-photos.com/10905112/5211794/5964326/s200_nuryadi.yassuki.jpg_oh_c65696ad809e8fc549a3124e0347999b_oe_54f3fab8___gda___1421767769_baa22f579f729776af84a61785658092\"]}},\"peer\":{\"publicKey\":\"59167a9980e2537008a6f7fabbb8244677822496405d1d59e65b9625db8e6158\",\"metadata\":{\"description\":\"Trust Wallet is a secure and easy-to-use mobile wallet\",\"url\":\"https://trustwallet.com\",\"icons\":[\"https://trustwallet.com/assets/images/media/assets/TWT.png\"],\"name\":\"Trust Wallet\",\"redirect\":{\"native\":\"trust://open\",\"linkMode\":false}}},\"transportType\":\"relay\"}', '0x1be4e12e9d2b36374ac8db8437ddc4f2f33c63c0', '2025-04-13 08:46:22', '2025-04-13 08:46:22');

--
-- Indexes for dumped tables
--

--
-- Indexes for table `admin_login`
--
ALTER TABLE `admin_login`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `api_key`
--
ALTER TABLE `api_key`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `bot_logs`
--
ALTER TABLE `bot_logs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `exchange`
--
ALTER TABLE `exchange`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `messages`
--
ALTER TABLE `messages`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `pairs`
--
ALTER TABLE `pairs`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `sessions`
--
ALTER TABLE `sessions`
  ADD PRIMARY KEY (`session_id`);

--
-- Indexes for table `strategy`
--
ALTER TABLE `strategy`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `trades`
--
ALTER TABLE `trades`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `trailing_sl`
--
ALTER TABLE `trailing_sl`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `users`
--
ALTER TABLE `users`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `IDX_e12875dfb3b1d92d7d7c5377e2` (`email`);

--
-- Indexes for table `user_wallet`
--
ALTER TABLE `user_wallet`
  ADD PRIMARY KEY (`id`);

--
-- Indexes for table `walletconnect_sessions`
--
ALTER TABLE `walletconnect_sessions`
  ADD PRIMARY KEY (`id`),
  ADD UNIQUE KEY `session_topic` (`session_topic`),
  ADD KEY `user_account` (`user_account`),
  ADD KEY `session_topic_2` (`session_topic`),
  ADD KEY `pairing_topic` (`pairing_topic`);

--
-- AUTO_INCREMENT for dumped tables
--

--
-- AUTO_INCREMENT for table `admin_login`
--
ALTER TABLE `admin_login`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `api_key`
--
ALTER TABLE `api_key`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=4;

--
-- AUTO_INCREMENT for table `bot_logs`
--
ALTER TABLE `bot_logs`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `exchange`
--
ALTER TABLE `exchange`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `messages`
--
ALTER TABLE `messages`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=6;

--
-- AUTO_INCREMENT for table `pairs`
--
ALTER TABLE `pairs`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=8;

--
-- AUTO_INCREMENT for table `strategy`
--
ALTER TABLE `strategy`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=2;

--
-- AUTO_INCREMENT for table `trades`
--
ALTER TABLE `trades`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `trailing_sl`
--
ALTER TABLE `trailing_sl`
  MODIFY `id` int NOT NULL AUTO_INCREMENT;

--
-- AUTO_INCREMENT for table `users`
--
ALTER TABLE `users`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=12;

--
-- AUTO_INCREMENT for table `user_wallet`
--
ALTER TABLE `user_wallet`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=30;

--
-- AUTO_INCREMENT for table `walletconnect_sessions`
--
ALTER TABLE `walletconnect_sessions`
  MODIFY `id` int NOT NULL AUTO_INCREMENT, AUTO_INCREMENT=61;
COMMIT;
