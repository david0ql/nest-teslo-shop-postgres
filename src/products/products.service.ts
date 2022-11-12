import {
  BadRequestException,
  Injectable,
  InternalServerErrorException,
  Logger,
  NotFoundException,
} from '@nestjs/common';
import { InjectRepository } from '@nestjs/typeorm';
import { Repository } from 'typeorm';
import { CreateProductDto } from './dto/create-product.dto';
import { UpdateProductDto } from './dto/update-product.dto';
import { Product } from './entities/product.entity';
import { PaginationDto } from '../common/dtos/pagination.dto';
import { validate as isUUID } from "uuid";


@Injectable()
export class ProductsService {
  private readonly logger = new Logger('ProductsService');
  constructor(
    @InjectRepository(Product)
    private readonly productRepository: Repository<Product>,
  ) {}

  async create(createProductDto: CreateProductDto) {
    try {
      const producto = this.productRepository.create(createProductDto);
      await this.productRepository.save(producto);
      return producto;
    } catch (error) {
      this.handleDBExceptions(error);
    }
  }

  findAll( paginationDto: PaginationDto ) {
    const { limit = 10, offset = 0} = paginationDto;
    return this.productRepository.find({
      take: limit,
      skip: offset,
      //relaciones
    })
  }

  async findOne( term: string ) {

    let product: Product;

    if ( isUUID(term) ) {
      product = await this.productRepository.findOneBy( {id: term });
    } else {
      const queryBuilder = this.productRepository.createQueryBuilder();
      product = await queryBuilder
        .where('UPPER(title) =:title or slug =:slug', {
          title: term.toUpperCase(),
          slug: term.toLowerCase()
        }).getOne();
    }

    if (!product) {
      throw new NotFoundException('Producto con el term: '+term+' no encontrado')
    }
    return product;
  }

  async update( id: string, updateProductDto: UpdateProductDto ) {

    const product = await this.productRepository.preload({
      id,
      ...updateProductDto
    })

    if (!product) {
      throw new NotFoundException("Produc with id "+id+" not found") 
    }

    try {
     await  this.productRepository.save(product);
     return product;
    } catch (error) {
      this.handleDBExceptions(error)
    }

    
  }

  remove(id: string) {
    return this.productRepository.delete({id})
  }

  private handleDBExceptions(error: any) {
    if (error.code === '23505') throw new BadRequestException(error.detail);

    this.logger.error(error);
    throw new InternalServerErrorException(
      'Unexpected error, check server logs',
    );
  }
}
