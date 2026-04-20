import {
  Controller,
  Get,
  Post,
  Body,
  Param,
  Delete,
  Put,
  Query,
  Req,
  UseGuards,
} from '@nestjs/common';
import { CustomerService } from './customer.service';
import {
  CreateCustomerDto,
  UpdateCustomerDto,
} from './dto/create-customer.dto';
import { JwtAuthGuard } from '../auth/jwt.guard';
@UseGuards(JwtAuthGuard)
@Controller('customers')
export class CustomerController {
  constructor(private readonly customerService: CustomerService) {}

  @Post()
  async create(@Body() createDto: CreateCustomerDto, @Req() req) {
    // If the Guard is working, req.user will now exist
    const orgId = req.user.orgId;
    return this.customerService.create({ ...createDto, orgId });
  }

  @Get()
  async findAll(
    @Req() req,
    @Query('search') search?: string,
    @Query('limit') limit?: string,
    @Query('page') page?: string,
  ) {
    return this.customerService.findAll({
      orgId: req.user.orgId,
      search,
      limit: limit ? parseInt(limit) : 20,
      page: page ? parseInt(page) : 1,
    });
  }

  @Get(':id')
  async findOne(@Param('id') id: string, @Req() req) {
    return this.customerService.findOne(id, req.user.orgId);
  }

  @Put(':id')
  async update(
    @Param('id') id: string,
    @Body() updateDto: UpdateCustomerDto,
    @Req() req,
  ) {
    return this.customerService.update(id, req.user.orgId, updateDto);
  }

  @Delete(':id')
  async remove(@Param('id') id: string, @Req() req) {
    // This now correctly calls the .delete() method in your service
    return this.customerService.delete(id, req.user.orgId);
  }
}
