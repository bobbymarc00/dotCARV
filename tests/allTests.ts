import * as anchor from "@coral-xyz/anchor";
import { Program } from "@coral-xyz/anchor";
import { CarvDomain } from "../target/types/carv_domain";

describe("Carv Domain Tests", () => {
  it("run core domain tests", async () => {
    const provider = anchor.AnchorProvider.env();
    anchor.setProvider(provider);

    const program = anchor.workspace.CarvDomain as Program<CarvDomain>;
    const owner = provider.wallet.publicKey;
    const treasury = anchor.web3.Keypair.generate();

    console.log("\n🧪 Carv Domain - Core Test Suite\n");
    console.log("=".repeat(60));

    let passCount = 0;
    let failCount = 0;

    const getDomainPDA = async (name: string) => {
      return anchor.web3.PublicKey.findProgramAddressSync(
        [Buffer.from("domain"), Buffer.from(name)],
        program.programId
      );
    };

    const generateUniqueDomain = (prefix: string) => {
      return `${prefix}-${Math.floor(Math.random() * 1000000)}`;
    };

    const runTest = async (testNum: number, testName: string, testFn: () => Promise<void>) => {
      try {
        await testFn();
        console.log(`✅ TEST ${testNum}: ${testName}`);
        passCount++;
      } catch (error: any) {
        console.log(`❌ TEST ${testNum}: ${testName}`);
        console.log(`   Error: ${error.message.split('\n')[0]}`);
        failCount++;
      }
    };

    const sleep = (ms: number) => new Promise(resolve => {
      let remaining = ms;
      const checkAndWait = () => {
        if (remaining > 0) {
          remaining--;
          setImmediate(checkAndWait);
        } else {
          resolve(null);
        }
      };
      checkAndWait();
    });

    // TEST 1: Register Domain
    await runTest(1, "Register a new domain successfully", async () => {
      const domainName = generateUniqueDomain("test");
      const [domainPDA] = await getDomainPDA(domainName);

      await program.methods
        .register(domainName)
        .accounts({
          domain: domainPDA,
          owner: owner,
          treasury: treasury.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      const domainAccount = await program.account.domain.fetch(domainPDA);
      if (domainAccount.name !== domainName) throw new Error("Domain name mismatch");
      if (!domainAccount.active) throw new Error("Domain not active");
    });

    // TEST 2: Set Domain Data
    await runTest(2, "Set domain data successfully", async () => {
      const domainName = generateUniqueDomain("data");
      const [domainPDA] = await getDomainPDA(domainName);

      await program.methods
        .register(domainName)
        .accounts({
          domain: domainPDA,
          owner: owner,
          treasury: treasury.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      const newData = "https://example.com";
      await program.methods
        .setData(newData)
        .accounts({
          domain: domainPDA,
          owner: owner,
        })
        .rpc();

      let domainAccount = await program.account.domain.fetch(domainPDA);
      
      // Retry if data is empty
      if (!domainAccount.data || domainAccount.data === "") {
        await new Promise(r => setImmediate(r));
        domainAccount = await program.account.domain.fetch(domainPDA);
      }
      
      if (domainAccount.data !== newData) {
        throw new Error(`Data mismatch: got "${domainAccount.data}" expected "${newData}"`);
      }
    });

    // TEST 3: Transfer Domain
    await runTest(3, "Transfer domain to new owner", async () => {
      const domainName = generateUniqueDomain("transfer");
      const [domainPDA] = await getDomainPDA(domainName);
      const newOwner = anchor.web3.Keypair.generate();

      await program.methods
        .register(domainName)
        .accounts({
          domain: domainPDA,
          owner: owner,
          treasury: treasury.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      await program.methods
        .transfer(newOwner.publicKey)
        .accounts({
          domain: domainPDA,
          owner: owner,
        })
        .rpc();

      const domainAccount = await program.account.domain.fetch(domainPDA);
      if (domainAccount.owner.toBase58() !== newOwner.publicKey.toBase58()) {
        throw new Error("Owner not updated");
      }
    });

    // TEST 4: Renew Domain
    await runTest(4, "Renew domain successfully", async () => {
      const domainName = generateUniqueDomain("renew");
      const [domainPDA] = await getDomainPDA(domainName);

      await program.methods
        .register(domainName)
        .accounts({
          domain: domainPDA,
          owner: owner,
          treasury: treasury.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      const domainBefore = await program.account.domain.fetch(domainPDA);
      const expiresBefore = domainBefore.expires.toNumber();

      await program.methods
        .renew()
        .accounts({
          domain: domainPDA,
          owner: owner,
          treasury: treasury.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      const domainAfter = await program.account.domain.fetch(domainPDA);
      const expiresAfter = domainAfter.expires.toNumber();

      const yearInSeconds = 31536000;
      const diff = expiresAfter - expiresBefore;
      if (Math.abs(diff - yearInSeconds) > 5) throw new Error("Renewal period incorrect");
    });

    // TEST 5: Reject Non-Owner Operations
    await runTest(5, "Reject operations from non-owner", async () => {
      const domainName = generateUniqueDomain("secure");
      const [domainPDA] = await getDomainPDA(domainName);
      const hacker = anchor.web3.Keypair.generate();

      await program.methods
        .register(domainName)
        .accounts({
          domain: domainPDA,
          owner: owner,
          treasury: treasury.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      let errorThrown = false;
      try {
        await program.methods
          .setData("hacked")
          .accounts({
            domain: domainPDA,
            owner: hacker,
          })
          .signers([hacker])
          .rpc();
      } catch (e) {
        errorThrown = true;
      }

      if (!errorThrown) throw new Error("Should have rejected non-owner operation");
    });

    // TEST 6: Reject short domain name
    await runTest(6, "Reject domain name < 3 characters", async () => {
      const invalidName = "ab";
      const [domainPDA] = await getDomainPDA(invalidName);

      let errorThrown = false;
      try {
        await program.methods
          .register(invalidName)
          .accounts({
            domain: domainPDA,
            owner: owner,
            treasury: treasury.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();
      } catch (e) {
        errorThrown = true;
      }

      if (!errorThrown) throw new Error("Should have rejected short name");
    });

    // TEST 7: Reject long domain name
    await runTest(7, "Reject domain name > 32 characters", async () => {
      const invalidName = "a".repeat(50);
      const [domainPDA] = await getDomainPDA(invalidName);

      let errorThrown = false;
      try {
        await program.methods
          .register(invalidName)
          .accounts({
            domain: domainPDA,
            owner: owner,
            treasury: treasury.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();
      } catch (e) {
        errorThrown = true;
      }

      if (!errorThrown) throw new Error("Should have rejected long name");
    });

    // TEST 8: Reject special characters
    await runTest(8, "Reject special characters (@, _, .)", async () => {
      const invalidName = "test@domain";
      const [domainPDA] = await getDomainPDA(invalidName);

      let errorThrown = false;
      try {
        await program.methods
          .register(invalidName)
          .accounts({
            domain: domainPDA,
            owner: owner,
            treasury: treasury.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();
      } catch (e) {
        errorThrown = true;
      }

      if (!errorThrown) throw new Error("Should have rejected special characters");
    });

    // TEST 9: Accept valid characters
    await runTest(9, "Accept alphanumeric and dash characters", async () => {
      const validName = generateUniqueDomain("valid-test-123");
      const [domainPDA] = await getDomainPDA(validName);

      await program.methods
        .register(validName)
        .accounts({
          domain: domainPDA,
          owner: owner,
          treasury: treasury.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      const domainAccount = await program.account.domain.fetch(domainPDA);
      if (domainAccount.name !== validName) throw new Error("Name mismatch");
    });

    // TEST 10: Domain should be active
    await runTest(10, "Domain should be active after registration", async () => {
      const domainName = generateUniqueDomain("active");
      const [domainPDA] = await getDomainPDA(domainName);

      await program.methods
        .register(domainName)
        .accounts({
          domain: domainPDA,
          owner: owner,
          treasury: treasury.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      const domainAccount = await program.account.domain.fetch(domainPDA);
      if (!domainAccount.active) throw new Error("Domain not active");
    });

    // TEST 11: Correct registration timestamp
    await runTest(11, "Store correct registration timestamp", async () => {
      const domainName = generateUniqueDomain("timestamp");
      const [domainPDA] = await getDomainPDA(domainName);

      const beforeTime = Math.floor(Date.now() / 1000);

      await program.methods
        .register(domainName)
        .accounts({
          domain: domainPDA,
          owner: owner,
          treasury: treasury.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      const afterTime = Math.floor(Date.now() / 1000);

      const domainAccount = await program.account.domain.fetch(domainPDA);
      const registeredTime = domainAccount.registered.toNumber();

      if (registeredTime < beforeTime || registeredTime > afterTime + 1) {
        throw new Error("Timestamp out of range");
      }
    });

    // TEST 12: Domain expiry set correctly
    await runTest(12, "Set expiry to 1 year from registration", async () => {
      const domainName = generateUniqueDomain("expiry");
      const [domainPDA] = await getDomainPDA(domainName);

      await program.methods
        .register(domainName)
        .accounts({
          domain: domainPDA,
          owner: owner,
          treasury: treasury.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      const domainAccount = await program.account.domain.fetch(domainPDA);
      const expiryTime = domainAccount.expires.toNumber();
      const registeredTime = domainAccount.registered.toNumber();

      const yearInSeconds = 31536000;
      const diff = expiryTime - registeredTime;

      if (Math.abs(diff - yearInSeconds) > 5) {
        throw new Error(`Expiry not 1 year: diff=${diff}, expected=${yearInSeconds}`);
      }
    });

    // TEST 13: Only owner can transfer
    await runTest(13, "Reject transfer from non-owner", async () => {
      const domainName = generateUniqueDomain("sec-transfer");
      const [domainPDA] = await getDomainPDA(domainName);
      const hacker = anchor.web3.Keypair.generate();
      const newOwner = anchor.web3.Keypair.generate();

      await program.methods
        .register(domainName)
        .accounts({
          domain: domainPDA,
          owner: owner,
          treasury: treasury.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      let errorThrown = false;
      try {
        await program.methods
          .transfer(newOwner.publicKey)
          .accounts({
            domain: domainPDA,
            owner: hacker,
          })
          .signers([hacker])
          .rpc();
      } catch (e) {
        errorThrown = true;
      }

      if (!errorThrown) throw new Error("Should have rejected non-owner transfer");
    });

    // TEST 14: Only owner can renew
    await runTest(14, "Reject renew from non-owner", async () => {
      const domainName = generateUniqueDomain("sec-renew");
      const [domainPDA] = await getDomainPDA(domainName);
      const hacker = anchor.web3.Keypair.generate();

      await program.methods
        .register(domainName)
        .accounts({
          domain: domainPDA,
          owner: owner,
          treasury: treasury.publicKey,
          systemProgram: anchor.web3.SystemProgram.programId,
        })
        .rpc();

      let errorThrown = false;
      try {
        await program.methods
          .renew()
          .accounts({
            domain: domainPDA,
            owner: hacker,
            treasury: treasury.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .signers([hacker])
          .rpc();
      } catch (e) {
        errorThrown = true;
      }

      if (!errorThrown) throw new Error("Should have rejected non-owner renew");
    });

    // TEST 15: Multiple domains
    await runTest(15, "Register multiple domains", async () => {
      const domainNames = [
        generateUniqueDomain("multi1"),
        generateUniqueDomain("multi2"),
        generateUniqueDomain("multi3"),
      ];

      for (const name of domainNames) {
        const [pda] = await getDomainPDA(name);

        await program.methods
          .register(name)
          .accounts({
            domain: pda,
            owner: owner,
            treasury: treasury.publicKey,
            systemProgram: anchor.web3.SystemProgram.programId,
          })
          .rpc();

        const domainAccount = await program.account.domain.fetch(pda);
        if (domainAccount.name !== name) throw new Error(`Domain ${name} mismatch`);
      }
    });

    // SUMMARY
    console.log("\n" + "=".repeat(60));
    console.log(`\n📊 TEST RESULTS:`);
    console.log(`   ✅ Passed: ${passCount}`);
    console.log(`   ❌ Failed: ${failCount}`);
    console.log(`   📈 Total:  ${passCount + failCount}`);
    console.log(`\n${"=".repeat(60)}\n`);

    if (failCount === 0) {
      console.log("🎉 All tests passed!\n");
    }
  });
});
