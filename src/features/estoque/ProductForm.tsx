import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { productFormSchema, type ProductFormInput } from '@/domain/product/product.schema';
import { createProductWithVariants } from '@/application/catalog';
import { catalogDeps } from './deps';
import styles from './estoque.module.scss';

interface Props {
  onCreated: () => void;
}

export function ProductForm({ onCreated }: Props) {
  const {
    register,
    handleSubmit,
    reset,
    setError,
    formState: { errors, isSubmitting },
  } = useForm<ProductFormInput>({
    resolver: zodResolver(productFormSchema),
    defaultValues: {
      name: '',
      category: '',
      ncm: '',
      baseSku: '',
      sizes: '',
      colors: '',
      priceReais: '',
      costReais: '',
    },
  });

  const onSubmit = async (values: ProductFormInput) => {
    try {
      await createProductWithVariants(values, catalogDeps);
      reset();
      onCreated();
    } catch (e) {
      setError('root', { message: e instanceof Error ? e.message : 'Erro ao salvar produto' });
    }
  };

  return (
    <form className={styles.form} onSubmit={handleSubmit(onSubmit)} noValidate>
      <label>
        Nome
        <input {...register('name')} />
        {errors.name && <span className={styles.fieldError}>{errors.name.message}</span>}
      </label>
      <label>
        Categoria
        <input {...register('category')} placeholder="Camisetas" />
        {errors.category && <span className={styles.fieldError}>{errors.category.message}</span>}
      </label>
      <label>
        NCM
        <input {...register('ncm')} placeholder="6109.10.00" />
        {errors.ncm && <span className={styles.fieldError}>{errors.ncm.message}</span>}
      </label>
      <label>
        Base do SKU
        <input {...register('baseSku')} placeholder="CAMISETA-BAS" />
        {errors.baseSku && <span className={styles.fieldError}>{errors.baseSku.message}</span>}
      </label>
      <label>
        Tamanhos
        <input {...register('sizes')} placeholder="P, M, G, GG" />
        {errors.sizes && <span className={styles.fieldError}>{errors.sizes.message}</span>}
      </label>
      <label>
        Cores
        <input {...register('colors')} placeholder="Azul, Preto" />
        {errors.colors && <span className={styles.fieldError}>{errors.colors.message}</span>}
      </label>
      <label>
        Preço de venda (R$)
        <input {...register('priceReais')} inputMode="decimal" placeholder="89,90" />
        {errors.priceReais && <span className={styles.fieldError}>{errors.priceReais.message}</span>}
      </label>
      <label>
        Custo (R$)
        <input {...register('costReais')} inputMode="decimal" placeholder="35,00" />
        {errors.costReais && <span className={styles.fieldError}>{errors.costReais.message}</span>}
      </label>
      <div className={styles.actions}>
        <button type="submit" disabled={isSubmitting}>
          {isSubmitting ? 'Salvando…' : 'Cadastrar produto e variações'}
        </button>
        {errors.root && <span className={styles.fieldError}>{errors.root.message}</span>}
      </div>
    </form>
  );
}
