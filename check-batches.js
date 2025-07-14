const { neon } = require('@neondatabase/serverless');

const sql = neon(process.env.DATABASE_URL);

async function checkBatches() {
  try {
    console.log('🔍 Checking card batches in database...');
    
    // Check if table exists
    const tableExists = await sql`
      SELECT EXISTS (
        SELECT FROM information_schema.tables 
        WHERE table_schema = 'public' 
        AND table_name = 'ezwich_card_batches'
      );
    `;
    
    console.log('Table exists:', tableExists[0]?.exists);
    
    if (!tableExists[0]?.exists) {
      console.log('❌ Card batches table does not exist');
      return;
    }
    
    // Get all batches
    const batches = await sql`
      SELECT 
        cb.*,
        b.name as branch_name
      FROM ezwich_card_batches cb
      LEFT JOIN branches b ON cb.branch_id = b.id
      ORDER BY cb.created_at DESC
    `;
    
    console.log(`✅ Found ${batches.length} total batches`);
    
    if (batches.length > 0) {
      console.log('\n📋 Batch details:');
      batches.forEach((batch, index) => {
        console.log(`${index + 1}. ${batch.batch_code} - ${batch.quantity_available} available (${batch.branch_name || batch.branch_id})`);
      });
    } else {
      console.log('❌ No batches found in database');
    }
    
    // Check branches
    const branches = await sql`
      SELECT id, name FROM branches
    `;
    
    console.log(`\n🏢 Found ${branches.length} branches:`);
    branches.forEach(branch => {
      console.log(`- ${branch.name} (${branch.id})`);
    });
    
  } catch (error) {
    console.error('❌ Error:', error);
  } finally {
    process.exit(0);
  }
}

checkBatches(); 