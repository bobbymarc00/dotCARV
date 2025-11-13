import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";

// Get IDL type from workspace
type CarvDomain = any;

// Helper to get domain PDA
function getDomainPDA(name: string, programId: anchor.web3.PublicKey) {
  return anchor.web3.PublicKey.findProgramAddressSync(
    [Buffer.from("domain"), Buffer.from(name)],
    programId
  );
}

// Main function
const main = async () => {
  try {
    console.log("🚀 Carv Domain Registration Client\n");
    console.log("=".repeat(60));

    // Initialize provider dan program
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.CarvDomain as Program<CarvDomain>;
    const owner = provider.wallet.publicKey;
    const treasury = anchor.web3.Keypair.generate().publicKey;

    console.log("\n👤 Connected as:", owner.toBase58());
    console.log("📍 Program ID:", program.programId.toBase58());
    console.log("💰 Treasury:", treasury.toBase58());
    console.log("\n" + "=".repeat(60));

    // ============================================
    // DEMO 1: Register Domain
    // ============================================
    console.log("\n[DEMO 1] Registering new domain...");
    
    const domainName = "mysite" + Math.floor(Math.random() * 100000);
    const [domainPDA] = getDomainPDA(domainName, program.programId);

    console.log("   Domain name:", domainName);
    console.log("   Domain PDA:", domainPDA.toBase58());

    const registerTx = await program.methods
      .register(domainName)
      .accounts({
        domain: domainPDA,
        owner: owner,
        treasury: treasury,
        systemProgram: anchor.web3.SystemProgram.programId,
      })
      .rpc();

    console.log("   ✅ Registration successful!");
    console.log("   Transaction:", registerTx);

    // ============================================
    // DEMO 2: Set Domain Data
    // ============================================
    console.log("\n[DEMO 2] Setting domain data...");
    
    try {
      const newData = "https://myawesome.site";
      console.log("   New data:", newData);

      const setDataTx = await program.methods
        .setData(newData)
        .accounts({
          domain: domainPDA,
          owner: owner,
        })
        .rpc();

      console.log("   ✅ Data updated!");
      console.log("   Transaction:", setDataTx);
    } catch (error: any) {
      console.log("   ⚠️ Could not set data");
      console.log("   Error:", error?.message?.split('\n')[0] || "Unknown error");
    }

    // ============================================
    // DEMO 3: Renew Domain
    // ============================================
    console.log("\n[DEMO 3] Renewing domain...");
    
    try {
      console.log("   Domain to renew:", domainName);

      const renewTx = await program.methods
        .renew()
        .accounts({
          domain: domainPDA,
          owner: owner,
          treasury: treasury,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      console.log("   ✅ Domain renewed successfully!");
      console.log("   Transaction:", renewTx);
      console.log("   Domain extended for 1 more year");
    } catch (error: any) {
      console.log("   ⚠️ Could not renew domain");
      console.log("   Error:", error?.message?.split('\n')[0] || "Unknown error");
    }

    // ============================================
    // DEMO 4: Transfer Domain
    // ============================================
    console.log("\n[DEMO 4] Transferring domain...");
    
    try {
      const newOwner = anchor.web3.Keypair.generate();
      console.log("   Current owner:", owner.toBase58().slice(0, 12) + "...");
      console.log("   New owner:", newOwner.publicKey.toBase58().slice(0, 12) + "...");

      const transferTx = await program.methods
        .transfer(newOwner.publicKey)
        .accounts({
          domain: domainPDA,
          owner: owner,
        })
        .rpc();

      console.log("   ✅ Domain transferred successfully!");
      console.log("   Transaction:", transferTx);
    } catch (error: any) {
      console.log("   ⚠️ Could not transfer domain");
      console.log("   Error:", error?.message?.split('\n')[0] || "Unknown error");
    }

    // ============================================
    // DEMO 5: List All Domains
    // ============================================
    console.log("\n[DEMO 5] Fetching all registered domains...");
    
    try {
      const allDomains = await program.account.domain.all();
      console.log("   Total domains:", allDomains.length);

      if (allDomains.length > 0) {
        console.log("\n   📚 All Registered Domains:");
        allDomains.forEach((domain, index) => {
          const expiryDate = new Date(domain.account.expires.toNumber() * 1000);
          const isActive = domain.account.active ? "🟢" : "🔴";
          
          console.log(`\n   ${index + 1}. ${domain.account.name} ${isActive}`);
          console.log(`      Owner: ${domain.account.owner.toBase58().slice(0, 12)}...`);
          console.log(`      Expires: ${expiryDate.toLocaleString()}`);
          console.log(`      Active: ${domain.account.active}`);
          if (domain.account.data) {
            console.log(`      Data: ${domain.account.data}`);
          }
        });
      }
    } catch (error: any) {
      console.log("   ⚠️ Error fetching domains");
    }

    console.log("\n" + "=".repeat(60));
    console.log("✅ Demo completed!");
    console.log("=".repeat(60));

  } catch (error: any) {
    console.error("\n❌ Fatal Error:", error?.message || error);
    if (error?.logs) {
      console.error("\n📋 Program Logs:");
      error.logs.slice(0, 5).forEach((log: string) => console.error("   ", log));
    }
  }
};

main();
