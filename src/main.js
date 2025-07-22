/**
 * Функция для расчета выручки с учетом скидки
 * @param {Object} purchase - запись о покупке
 * @param {Object} _product - карточка товара (не используется)
 * @returns {number} - выручка от операции
 */
function calculateSimpleRevenue(purchase, _product) {
    const discountFactor = 1 - (purchase.discount / 100);
    return purchase.sale_price * purchase.quantity * discountFactor;
}

/**
 * Функция для расчета бонусов по позиции в рейтинге
 * @param {number} index - порядковый номер в отсортированном массиве (0-based)
 * @param {number} total - общее число продавцов
 * @param {Object} seller - карточка продавца
 * @returns {number} - размер бонуса (процент от прибыли)
 */
function calculateBonusByProfit(index, total, seller) {
    if (index === 0) return 0.15; // 15% для первого места
    if (index === 1 || index === 2) return 0.10; // 10% для второго и третьего места
    if (index === total - 1) return 0; // 0% для последнего места
    return 0.05; // 5% для всех остальных
}

/**
 * Главная функция для анализа данных продаж
 * @param {Object} data - входные данные
 * @param {Object} options - настройки
 * @returns {Object[]} - массив с результатами по каждому продавцу
 */
function analyzeSalesData(data, options) {
    // Проверка входных данных
    if (!data || !Array.isArray(data.sellers) || !Array.isArray(data.products) || 
        !Array.isArray(data.purchase_records) || data.sellers.length === 0) {
        throw new Error('Некорректные входные данные');
    }

    // Проверка наличия опций
    const { calculateRevenue, calculateBonus } = options;
    if (!calculateRevenue || !calculateBonus) {
        throw new Error('Не переданы необходимые функции для расчетов');
    }

    // Подготовка промежуточных данных
    const sellerStats = data.sellers.map(seller => ({
        id: seller.id,
        name: `${seller.first_name} ${seller.last_name}`,
        revenue: 0,
        profit: 0,
        sales_count: 0,
        products_sold: {}
    }));

    // Создание индексов для быстрого доступа
    const sellerIndex = sellerStats.reduce((acc, seller) => {
        acc[seller.id] = seller;
        return acc;
    }, {});

    const productIndex = data.products.reduce((acc, product) => {
        acc[product.sku] = product;
        return acc;
    }, {});

    // Расчет выручки и прибыли
    data.purchase_records.forEach(record => {
        const seller = sellerIndex[record.seller_id];
        seller.sales_count += 1;
        
        record.items.forEach(item => {
            const product = productIndex[item.sku];
            const cost = product.purchase_price * item.quantity;
            const revenue = calculateRevenue(item, product);
            const profit = revenue - cost;
            
            seller.revenue += revenue;
            seller.profit += profit;
            
            if (!seller.products_sold[item.sku]) {
                seller.products_sold[item.sku] = 0;
            }
            seller.products_sold[item.sku] += item.quantity;
        });
    });

    // Сортировка продавцов по прибыли (по убыванию)
    sellerStats.sort((a, b) => b.profit - a.profit);

    // Назначение бонусов
    sellerStats.forEach((seller, index) => {
        const bonusRate = calculateBonus(index, sellerStats.length, seller);
        seller.bonus = seller.profit * bonusRate;
        
        // Формирование топ-10 товаров
        seller.top_products = Object.entries(seller.products_sold)
            .map(([sku, quantity]) => ({ sku, quantity }))
            .sort((a, b) => b.quantity - a.quantity)
            .slice(0, 10);
    });

    // Подготовка итогового результата
    return sellerStats.map(seller => ({
        seller_id: seller.id,
        name: seller.name,
        revenue: +seller.revenue.toFixed(2),
        profit: +seller.profit.toFixed(2),
        sales_count: seller.sales_count,
        top_products: seller.top_products,
        bonus: +seller.bonus.toFixed(2)
    }));
}
