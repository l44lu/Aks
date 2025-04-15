const User = require("../../models/userSchema");
const Wallet = require("../../models/walletSchema");
const mongoose = require("mongoose");


const renderTransactionsPage = async (req, res) => {
    try {
      let page = parseInt(req.query.page) || 1;
      let limit = 5;
      let skip = (page - 1) * limit;
  
      const search = req.query.search || '';
      const type = req.query.type || '';
      const sortField = req.query.sortField || 'transaction.createdAt';
      const sortOrder = req.query.sortOrder === 'asc' ? 1 : -1;
      const dateFilter = req.query.dateFilter || '';
      
      let startDate = req.query.startDate ? new Date(req.query.startDate) : null;
      let endDate = req.query.endDate ? new Date(req.query.endDate) : null;
      
      if (dateFilter) {
        const now = new Date();
        endDate = new Date(now);
        
        switch(dateFilter) {
          case 'today':
            startDate = new Date(now.setHours(0, 0, 0, 0));
            break;
          case 'week':
            startDate = new Date(now);
            startDate.setDate(now.getDate() - now.getDay()); // Beginning of current week (Sunday)
            startDate.setHours(0, 0, 0, 0);
            break;
          case 'month':
            startDate = new Date(now.getFullYear(), now.getMonth(), 1); // First day of current month
            break;
          case 'quarter':
            startDate = new Date(now);
            startDate.setMonth(now.getMonth() - 3);
            break;
        }
      }
      
      const minAmount = req.query.minAmount ? parseFloat(req.query.minAmount) : null;
      const maxAmount = req.query.maxAmount ? parseFloat(req.query.maxAmount) : null;
      const userFilter = req.query.user || '';
      const transactionIdFilter = req.query.transactionId || '';
      
      let matchCriteria = {};
      
      if (type) {
        matchCriteria['transaction.type'] = type;
      }
      
      if (startDate || endDate) {
        matchCriteria['transaction.createdAt'] = {};
        if (startDate) {
          matchCriteria['transaction.createdAt']['$gte'] = startDate;
        }
        if (endDate) {
          const nextDay = new Date(endDate);
          nextDay.setDate(nextDay.getDate() + 1);
          matchCriteria['transaction.createdAt']['$lt'] = nextDay;
        }
      }
      
      if (minAmount !== null || maxAmount !== null) {
        matchCriteria['transaction.amount'] = {};
        if (minAmount !== null) {
          matchCriteria['transaction.amount']['$gte'] = minAmount;
        }
        if (maxAmount !== null) {
          matchCriteria['transaction.amount']['$lte'] = maxAmount;
        }
      }
      
      if (transactionIdFilter) {
        matchCriteria['transaction.transactionId'] = { $regex: transactionIdFilter, $options: 'i' };
      }
      
      if (userFilter) {
        matchCriteria['$or'] = [
          { 'user.name': { $regex: userFilter, $options: 'i' } },
          { 'user.email': { $regex: userFilter, $options: 'i' } }
        ];
      }
      
      if (search && !userFilter && !transactionIdFilter) {
        matchCriteria['$or'] = [
          { 'transaction.transactionId': { $regex: search, $options: 'i' } },
          { 'user.name': { $regex: search, $options: 'i' } },
          { 'user.email': { $regex: search, $options: 'i' } }
        ];
      }
      
      const aggregationPipeline = [
        { $unwind: "$transaction" },
        {
          $lookup: {
            from: "users",
            localField: "user",
            foreignField: "_id",
            as: "user",
          },
        },
        { $unwind: "$user" },
      ];
      
      if (Object.keys(matchCriteria).length > 0) {
        aggregationPipeline.push({ $match: matchCriteria });
      }
      
      aggregationPipeline.push({ $sort: { [sortField]: sortOrder } });
      
      const countPipeline = [...aggregationPipeline];
      countPipeline.push({ $count: "total" });
      
      aggregationPipeline.push({ $skip: skip });
      aggregationPipeline.push({ $limit: limit });
      
      aggregationPipeline.push({
        $project: {
          "transaction": 1,
          "user.name": 1,
          "user.email": 1,
          "user._id": 1,
        }
      });
      
      const transactionsAggregate = await Wallet.aggregate(aggregationPipeline);
      
      const totalTransactions = await Wallet.aggregate(countPipeline);
      const total = totalTransactions.length > 0 ? totalTransactions[0].total : 0;
      const totalPages = Math.ceil(total / limit) || 1;
      
      res.render("transaction", {
        transactions: transactionsAggregate,
        currentPage: page,
        totalPages,
        search,
        type,
        dateFilter,
        sortField,
        sortOrder: req.query.sortOrder || 'desc',
        startDate: startDate ? startDate.toISOString().split('T')[0] : '',
        endDate: endDate ? endDate.toISOString().split('T')[0] : '',
        minAmount: req.query.minAmount || '',
        maxAmount: req.query.maxAmount || '',
        user: req.query.user || '',
        transactionId: req.query.transactionId || ''
      });
      
    } catch (error) {
      console.error("Error loading wallet details:", error);
      res.status(500).send("Error loading wallet details");
    }
  };


  
const renderTransactionDetailsPage = async (req, res) => {
    try {
        const { transactionId } = req.params;
        const wallet = await Wallet.findOne({ "transaction.transactionId": transactionId }).populate("user", "name email");

        if (!wallet) {
            return res.status(404).send("Transaction not found");
        }

        const transactionDetails = wallet.transaction.find(t => t.transactionId === transactionId);
        res.render('transactionDetailPage', { transaction: transactionDetails, user: wallet.user });
    } catch (error) {
        res.status(500).send("Error loading transaction details");
    }
};

const renderWalletPage = async (req, res) => {
    try {

        const { userId } = req.params

        let page = parseInt(req.query.page) || 1;
        let limit = 5; 
        let skip = (page - 1) * limit;

        const wallet = await Wallet.findOne({ user: userId })
            .populate("user", "name email")
            .lean(); 

        if (!wallet) {
            console.log("No wallet found for user:", userId);
            return res.status(404).send("Wallet not found for this user");
        }

        wallet.transaction = wallet.transaction.sort((a, b) => new Date(b.createdAt) - new Date(a.createdAt));
        const transactions = wallet.transaction.slice(skip, skip + limit);
        const totalTransactions = wallet.transaction.length;
        const totalPages = Math.ceil(totalTransactions / limit);


        res.render('userWalletDetailPage', { 
            wallet, 
            transactions, 
            currentPage: page,
            totalPages
        });
    } catch (error) {
        console.error("Error loading wallet details:", error);
        res.status(500).send("Error loading wallet details");
    }
};




module.exports ={
    renderTransactionsPage,
    renderTransactionDetailsPage,
    renderWalletPage
}