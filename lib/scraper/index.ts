import axios from "axios";
import * as cheerio from 'cheerio';
import { extractCurrency, extractDescription, extractPrice } from "../utils";

export async function scrapeAmazonProduct(url:string) {
    if(!url) return;

    const username = String(process.env.BRIGHT_DATA_USERNAME) ;
    const password = String(process.env.BRIGHT_DATA_PASSWORD) ;
    const port = 22225;
    const session_id = (1000000* Math.random()) | 0;
    const options = {
        auth: {
            username: `${username}-session-${session_id}`,
            password,    
        },
        host: 'brd.superproxy.io',
        port,
        rejectUnauthorized: false,
    }

    try {
        const response = await axios.get(url,options);
        const $ = cheerio.load(response.data);
        
        const title = $('#productTitle').text().trim();
        const currentPrice = extractPrice(
            $('.priceToPay span.a-price-whole'),
            $('.a.size.base.a-color-price'),
            $('.a-button-selected .a-color-base')
        );
        // const test = $('td.a-span12 span.a-price.a-text-price.a-size-medium.apexPriceToPay span.a-offscreen').text()

        const originalPrice = extractPrice(
            $('#priceblock_ourprice'),
            $('.a-price.a-text-price span.a-offscreen'),
            $('#listPrice'),
            $('#price-block_dealprice'),
            $('.a-size-base.a-color-price')
        );

        const outOfStock = $('#availability span').text().trim().toLowerCase() === 'currently unavailable';
        const images = 
            $('#imgBlkFront').attr('data-a-dynamic-image') ||
            $('#landingImage').attr('data-a-dynamic-image') ||
            '{}';
         
        const imageUrls = Object.keys(JSON.parse(images));

        const currency = extractCurrency($('.a-price-symbol'));

        const discountRate = $('.savingsPercentage').text();
        const discRate = discountRate.substr(discountRate.length/2).replace(/[-%]/g,'');
        const description = extractDescription($)
        const test:any = Number(discRate) == 0 ? currentPrice: Number(originalPrice)
        const data ={
            url,
            currency: currency || '€',
            image: imageUrls[0],
            title,
            currentPrice: Number(currentPrice) || Number(originalPrice),
            originalPrice: test || Number(originalPrice),
            priceHistory: [],
            discountRate: Number(discRate)||0,
            isOutOfStock: outOfStock,
            description,
            lowestPrice: Number(currentPrice)|| Number(originalPrice),
            highestPrice: test || Number(originalPrice),
            averagePrice: Number(currentPrice)|| Number(originalPrice),
        }
        
        return data;
       
    } catch (error: any) {
        throw new Error(`failed to scrape product: ${error.message}`);
    }
}