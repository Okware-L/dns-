const { hexStripZeros } = require("ethers/lib/utils")

const main = async () => {
    const domainContractFactory = await hre.ethers.getContractFactory('Domains');
    const domainContract = await domainContractFactory.deploy('ke');
    await domainContract.deployed();

    console.log("conytract deployed to: ", domainContract.address);

    let txn =  await domainContract.register("okware", {value: hre.ethers.utils.parseEther('0.1')});
    await txn.wait();
    console.log("minted domain okware.ke");


    txn = await domainContract.setRecord("okware", "am i okware or not" );
    await txn.wait();
    console.log("set record for okware.ke");

    const address = await domainContract.getAddress("okware");
    console.log("Owner of okware.ke is :", address);


    const balance = await hre.ethers.provider.getBalance(domainContract.address);
    console.log("Contract balance :", hre.ethers.utils.formatEther(balance));

}

const runMain = async () => {
    try {
        await main();
        process.exit(0);
    } catch (error) {
        console.log(error);
        process.exit(1);

    }
};

runMain();

