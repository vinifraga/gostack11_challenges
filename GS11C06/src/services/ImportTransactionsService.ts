import csvParse from 'csv-parse';
import fs from 'fs';
import { getCustomRepository, getRepository, In } from 'typeorm';

import AppError from '../errors/AppError';
import TransactionsRepository from '../repositories/TransactionsRepository';
import Transaction from '../models/Transaction';
import Category from '../models/Category';

interface Request {
  path: string;
}

interface CategoriesDict {
  [key: string]: string;
}

interface CsvTransaction {
  title: string;
  type: 'income' | 'outcome';
  value: number;
  category: string;
}

class ImportTransactionsService {
  async execute({ path }: Request): Promise<Transaction[]> {
    const transactionsRepository = getCustomRepository(TransactionsRepository);
    const categoriesRepository = getRepository(Category);

    const readCSVStream = fs.createReadStream(path);

    const parseStream = csvParse({
      from_line: 2,
      ltrim: true,
      rtrim: true,
    });

    const parseCSV = readCSVStream.pipe(parseStream);

    const csvTransactions: CsvTransaction[] = [];
    const csvCategories: string[] = [];

    parseCSV.on('data', async line => {
      csvTransactions.push({
        title: line[0],
        type: line[1],
        value: Number(line[2]),
        category: line[3],
      });
      if (!csvCategories.includes(line[3])) csvCategories.push(line[3]);
    });

    await new Promise(resolve => {
      parseCSV.on('end', resolve);
    });

    await fs.promises.unlink(path);

    const csvBalance = csvTransactions.reduce((acc, csvTransaction): number => {
      const value =
        csvTransaction.type === 'income'
          ? csvTransaction.value
          : -csvTransaction.value;
      return acc + value;
    }, 0);

    const balance = await transactionsRepository.getBalance();

    if (balance.total < -csvBalance) {
      throw new AppError('Insufficient balance');
    }

    const existentCategories = await categoriesRepository.find({
      where: { title: In(csvCategories) },
    });

    const categories: CategoriesDict = {};

    existentCategories.forEach(category => {
      categories[category.title] = category.id;
    });

    const existentCategoriesTitles = existentCategories.map(
      category => category.title,
    );

    const nonExistentCategoriesTitles = csvCategories.filter(
      category => !existentCategoriesTitles.includes(category),
    );

    if (nonExistentCategoriesTitles.length > 0) {
      const newCategories = nonExistentCategoriesTitles.map(title => {
        const category = categoriesRepository.create({ title });

        return category;
      });

      const categoriesCreated = await categoriesRepository.save(newCategories);

      categoriesCreated.forEach(category => {
        categories[category.title] = category.id;
      });
    }

    const newTransactions = csvTransactions.map(csvTransaction =>
      transactionsRepository.create({
        title: csvTransaction.title,
        type: csvTransaction.type,
        value: csvTransaction.value,
        category_id: categories[csvTransaction.category],
      }),
    );

    const transactions = await transactionsRepository.save(newTransactions);

    return transactions;
  }
}

export default ImportTransactionsService;
